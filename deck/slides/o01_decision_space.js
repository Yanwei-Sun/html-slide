// What is the optimal mechanism?.
(function () {
  const FS = 170;          // font size of the tuple (px): the tuple spans the stage between the side margins
  const ROW = 380;         // top of the tuple row: the whole group is centred in the area below the title
  const GAP = 24;          // gap between a glyph and an arrow tip
  const A = {}, lab = {};
  let brace, free;

   
  function arrow(svg, L) {
    const g = L.g(svg);
    const shaft = L.line(g, 0, 0, 0, 1, { color: 'ink3', w: 3.5 });
    const head = L.path(g, 'M0,0', { color: 'none', fill: 'ink3' });
    return { shaft, head };
  }
  function setArrow(L, a, x, y0, y1) {                     // tail (x, y0) -> tip (x, y1)
    const d = Math.sign(y1 - y0), h = 20, w = 9;
    L.seg(a.shaft, x, y0, x, y1 - d * h * 0.7);
    a.head.setAttribute('d', `M${x},${y1}L${x - w},${y1 - d * h}L${x + w},${y1 - d * h}Z`);
  }
  // thin curly brace over [x1, x2]: feet at y, tip at y - h
  function bracePath(x1, x2, y, h) {
    const xm = (x1 + x2) / 2, r = 20, ym = y - h / 2;
    return `M${x1},${y}Q${x1},${ym} ${x1 + r},${ym}L${xm - r},${ym}Q${xm},${ym} ${xm},${y - h}` +
           `Q${xm},${ym} ${xm + r},${ym}L${x2 - r},${ym}Q${x2},${ym} ${x2},${y}`;
  }
  // top and bottom of each piece's math box, in em below the row top. These are fixed by the TeX fonts; measuring them
  // is unreliable before the math fonts have loaded (after() runs then, and print mode clones the slide at once).
  const EM = { a: [0.462, 1.151], p: [0.462, 1.192], q: [0.462, 1.192], s1: [0.019, 1.261], s0: [0.019, 1.261] };
  const box = (k, l, r) => ({ l, r, x: (l + r) / 2, t: ROW + EM[k][0] * FS, b: ROW + EM[k][1] * FS });
  // stage-pixel boxes of the typeset pieces [data-k]: x is measured (the slide is shown for a moment), y is from EM
  function boxes(el) {
    const was = el.style.display; el.style.display = 'block';
    const R = el.getBoundingClientRect(), s = R.width / 1920 || 1, out = {};
    el.querySelectorAll('.o1-row [data-k]').forEach(n => {
      const r = (n.querySelector('mjx-math') || n).getBoundingClientRect(), k = n.dataset.k;
      out[k] = box(k, (r.left - R.left) / s, (r.right - R.left) / s);
    });
    el.style.display = was;
    return out;
  }
  // lay out arrows, brace and labels around the measured pieces
  function layout(L, b) {
    const top = Math.min(b.s1.t, b.s0.t);                   // top of the sigmas (superscripts)
    const yUp = top - 26 - 30 - 22;                          // bottom of the upper labels
    const yDn = Math.max(b.a.b, b.q.b) + GAP + 90;           // tails of the lower arrows
    L.place(lab.sp, b.p.x, yUp); setArrow(L, A.sp, b.p.x, yUp + 14, b.p.t - GAP);
    brace.setAttribute('d', bracePath(b.s1.l + 5, b.s0.r - 5, top - 26, 30));   // feet clear the superscripts' ink
    L.place(lab.ar, (b.s1.l + b.s0.r) / 2, yUp);
    L.place(lab.cap, b.a.x, yDn + 14); setArrow(L, A.cap, b.a.x, yDn, b.a.b + GAP);
    L.place(lab.fp, b.q.x, yDn + 14); setArrow(L, A.fp, b.q.x, yDn, b.q.b + GAP);
    L.place(free, (b.p.x + b.q.x) / 2, yDn + 156);
  }

  const cm = '<span class="cm">\\(,\\)</span>';
  Deck.slide({
    id: 'O01', section: 'Optimal mechanism', title: 'What is the optimal mechanism?', steps: 0,
    notes: [
  "Each item now has a capability, two prices chosen freely, and any outcome-alignment rule, even one that <b>calls</b> a <b>true</b> failure a success."
],
    html: `
      <style>
        .slide[data-id="O01"] .o1-row { left: 0; right: 0; top: ${ROW}px; text-align: center; font-size: ${FS}px;
          line-height: 1; white-space: nowrap; }
        .slide[data-id="O01"] .o1-row > span { display: inline-block; }
        .slide[data-id="O01"] .o1-row .cm { margin-right: 0.42em; }
        .slide[data-id="O01"] .o1-row .lp { margin-right: 0.08em; }
        .slide[data-id="O01"] .o1-row .rp { margin-left: 0.06em; }
      </style>
      <div class="abs o1-row">` +
        '<span class="lp">\\(\\big(\\)</span>' +
        '<span data-k="a">\\(a_r\\)</span>' + cm +
        '<span data-k="p" class="c-orange">\\(p_r\\)</span>' + cm +
        '<span data-k="q" class="c-orange">\\(q_r\\)</span>' + cm +
        '<span data-k="s1" class="c-purple">\\(\\sigma_r^1\\)</span>' + cm +
        '<span data-k="s0" class="c-purple">\\(\\sigma_r^0\\)</span>' +
        '<span class="rp">\\(\\big)\\)</span>' +
      '</div>',
    init(el, L) {
      const svg = L.svg(el);
      A.cap = arrow(svg, L);
      A.sp = arrow(svg, L);
      A.fp = arrow(svg, L);
      brace = L.path(svg, 'M0,0', { color: 'ink3', w: 3.5 });
      const o = anchor => ({ anchor, color: 'ink2', style: 'font-size:40px' });
      lab.cap = L.label(el, 0, 0, 'capability', o('t'));
      lab.sp = L.label(el, 0, 0, 'success price', o('b'));
      lab.fp = L.label(el, 0, 0, 'failure price', o('t'));
      lab.ar = L.label(el, 0, 0, 'any outcome-alignment rule', o('b'));
      free = L.label(el, 0, 0, '<span class="c-orange">both prices</span> chosen freely',
        { anchor: 't', color: 'ink', style: 'font-size:48px' });
      // the two formats were restrictions on exactly these two numbers (paper, contract classes)
      const pr = '<span class="c-orange">\\(p_r\\)</span>', qr = '<span class="c-orange">\\(q_r\\)</span>';
      // provisional layout (nominal piece positions); after() replaces it with measured ones
      layout(L, { a: box('a', 260, 439), p: box('p', 564, 738), q: box('q', 863, 1026), s1: box('s1', 1151, 1344), s0: box('s0', 1469, 1663) });
    },
    after(el, L) {
      const b = boxes(el);
      if (['a', 'p', 'q', 's1', 's0'].every(k => b[k] && b[k].r > b[k].l)) layout(L, b);
    }
  });
})();
