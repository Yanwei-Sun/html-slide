// Buyers have two-dimensional private information.
(function () {
  

  const T0 = [[0.12, 0.36], [0.36, 0.66], [0.30, 0.42], [0.44, 0.33], [0.85, 0.55], [0.70, 0.54]];
  const T = [[0.18, 0.29], [0.31, 0.88], [0.43, 0.57], [0.56, 0.21], [0.74, 0.65], [0.92, 0.44]];
  const IA = 1, IB = 5;                      

  const SX0 = 1318, SX1 = 1754, SY = 470;
  const GX = (SX0 + SX1) / 2;
  const CW = 150, CH = 84, CD = 110;         // a chip's width and height; its centre's offset from GX
  const RR = 28;                             // highlight ring radius + gap: the projections start here
  let P, dots, ghosts, trails, rings, proj, chips, labs, words;
  // draw() receives the engine's eased progress; undo the easing so that click 2 can stage its parts,
  // each with its own ease-in-out
  const ease = Deck.ease, unease = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
  const seg = (t, a, b) => ease(Math.max(0, Math.min(1, (t - a) / (b - a))));

  Deck.slide({
    id: 'D02', section: 'Model', title: 'Buyers have two-dimensional private information', steps: 2,
    notes: [
  "<b>Let me plot</b> each buyer type as <b>one dot</b>, by her success probability and her expected value.",
  "Deploy <b>another</b> capability, and each dot moves in <b>its own way</b>.",
  "Take these two buyers: one has high value but hard tasks, the other low value but easy tasks. Each is ahead on one dimension and behind on the other, so there's no natural high type. And there's <b>another complication</b>: the AI itself <b>reports the outcome</b>."
],
    html: `
      <style>
        .slide[data-id="D02"] .d02-x { font-size:36px; line-height:1.3; }
        .slide[data-id="D02"] .lab.d02-n { font-size:40px; }
      </style>
      <div class="abs center d02-words" style="left:${GX - 250}px;width:500px;top:806px;opacity:0">
        <div class="big">no natural “high” type</div>
        <div class="d02-x c-ink2">two-dimensional screening</div>
      </div>`,
    init(el, L) {
      const svg = L.svg(el);
      P = L.plot({ x0: 156, y0: 920, w: 920, h: 700 });   // U02's frame: origin label "0" clears the 120 px margin
      const ax = L.axes(el, P, { x: '\\(\\gamma_t(a)\\)', xColor: 'gold', xNote: 'success probability', y: '\\(v_t(a)\\)', yColor: 'blue', yNote: 'expected value', yNoteDx: 124, xticks: [[1, '1']] });
      // labels: [0, x, x note, y, y note, tick 1]; symbols up to 40 px, notes up to 36 px, tick labels as they are
      [1, 3].forEach(i => ax.labels[i].classList.add('d02-n'));
      [2, 4].forEach(i => ax.labels[i].classList.remove('s'));

      // click 1: where each type was (a hollow ghost) and the path it took (a ray segment)
      const g0 = L.g(svg);
      trails = T.map(() => L.line(g0, 0, 0, 0, 0, { color: 'rule', w: 3 }));
      ghosts = T0.map(([x, y]) => L.ring(g0, P.X(x), P.Y(y), { color: 'ink3', r: 9, w: 2.5 }));

      // click 2: the two buyers, projected onto both axes
      proj = [IA, IB].map(i => {
        const [x, y] = T[i], gx = P.X(x), gy = P.Y(y);
        return { h: L.line(svg, gx, gy, gx, gy, { color: 'blue', w: 3, dash: '9 9', cap: 'butt' }),
                 v: L.line(svg, gx, gy, gx, gy, { color: 'gold', w: 3, dash: '9 9', cap: 'butt' }),
                 ty: L.line(svg, P.x0 - 12, gy, P.x0 + 12, gy, { color: 'blue', w: 6 }),
                 tx: L.line(svg, gx, P.y0 - 12, gx, P.y0 + 12, { color: 'gold', w: 6 }), gx, gy };
      });
      rings = [IA, IB].map(i => { const c = L.ring(svg, P.X(T[i][0]), P.Y(T[i][1]), { color: 'ink', r: RR - 4, w: 3 }); c.setAttribute('pathLength', 1); c.style.strokeDasharray = 1; return c; });
      dots = T.map(([x, y]) => L.dot(svg, P.X(x), P.Y(y), { r: 11 }));
      labs = [[IA, 'high value', 'hard tasks'], [IB, 'low value', 'easy tasks']].map(([i, v, g]) =>
        L.label(el, P.X(T[i][0]) + 40, P.Y(T[i][1]), `<span class="c-blue">${v}</span><br><span class="c-gold">${g}</span>`,
          { anchor: 'l', style: 'font-size:36px;line-height:1.3' }));
      words = el.querySelector('.d02-words');

       
      const gs = L.flags(L.g(svg), { dim: 2 });
      chips = [GX - CD, GX + CD].map((cx, i) => {
        L.rect(gs, cx - CW / 2, SY - CH / 2, CW, CH, { r: 14, color: 'ink3', w: 2.5 });
        const on = L.rect(gs, cx - CW / 2, SY - CH / 2, CW, CH, { r: 14, color: 'ink', w: 4, fill: 'wash' });
        L.label(el, cx, SY + (i ? 0 : 5), i ? "\\(a'\\)" : '\\(a\\)', { anchor: 'c', cls: 'd02-n', dim: 2 });   // a has no ascender
        return on;
      });
      L.label(el, GX, SY - CH / 2 - 26, 'AI capability', { anchor: 'cb', cls: 'd02-n', dim: 2 });

    },
    state: k => [
      { u: 0, tr: 0, hi: 0 },
      { u: 1, tr: 1, hi: 0 },
      { u: 1, tr: 1, hi: 1 }][k],
    dur: k => (k === 1 ? 1400 : 1500),
    draw(el, s, L) {
      const u = s.u, t = unease(s.hi);
      // the motion trails of click 1 clear away at the start of click 2
      const tr = s.tr * (1 - seg(t, 0, 0.3)), grey = seg(t, 0, 0.4);
      T.forEach(([x, y], i) => {
        const [x0, y0] = T0[i], cx = P.X(L.mix(x0, x, u)), cy = P.Y(L.mix(y0, y, u));
        L.at(dots[i], cx, cy);
        L.seg(trails[i], P.X(x0), P.Y(y0), cx, cy);
        trails[i].style.opacity = tr;
        ghosts[i].style.opacity = tr;
        // at click 2 every other type steps back to grey (ink at 42% on white is ink3)
        dots[i].style.opacity = i === IA || i === IB ? 1 : 1 - 0.58 * grey;
      });
      chips.forEach((c, i) => { c.style.opacity = i ? u : 1 - u; });
      // click 2: rings, then the projections grow from each ring to both axes, then the words
      const ur = seg(t, 0.1, 0.42), up = seg(t, 0.28, 0.72), ut = seg(t, 0.64, 0.76);
      rings.forEach(c => { c.style.strokeDashoffset = 1 - ur; c.style.opacity = ur > 0 ? 1 : 0; });
      proj.forEach(q => {
        L.seg(q.h, q.gx - RR, q.gy, L.mix(q.gx - RR, P.x0, up), q.gy);
        L.seg(q.v, q.gx, q.gy + RR, q.gx, L.mix(q.gy + RR, P.y0, up));
        [q.h, q.v].forEach(n => { n.style.opacity = up > 0 ? 1 : 0; });
        [q.ty, q.tx].forEach(n => { n.style.opacity = ut; });
      });
      labs.forEach(n => { n.style.opacity = seg(t, 0.45, 0.75); });
      words.style.opacity = seg(t, 0.72, 1);
    }
  });
})();
