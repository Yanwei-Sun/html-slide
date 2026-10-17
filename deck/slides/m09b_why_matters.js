// Why does this matter?.
(function () {
  const XU = 660, XO = 1150;                            // each row: from paying for use (left) to paying for results (right)
  const X0 = 580, X1 = 1230;                            // each row's track
  const Y1 = 356, Y2 = 704;                              
  const IS = 58, IY = 72;                               // icon size; icon centre above its node
  const XR = 1380, KEY = 870, YH = 196;                  

  function drawIcon(L, g, name, color) {
    const S = { fill: 'none', stroke: L.C[color] || L.C.ink2, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const E = (tag, a) => L.el(g, tag, Object.assign({}, S, a));
    if (name === 'search') { E('circle', { cx: 42, cy: 42, r: 25 }); E('line', { x1: 61, y1: 61, x2: 84, y2: 84, 'stroke-width': 7 }); }
    if (name === 'robot') L.icon(g, 'robot', 50, 50, 100, { color: 'ink', w: 5 });
    if (name === 'eye') { E('path', { d: 'M4,50 C24,17 76,17 96,50 C76,83 24,83 4,50 Z' }); E('circle', { cx: 50, cy: 50, r: 15 });
      L.el(g, 'circle', { cx: 50, cy: 50, r: 6, fill: S.stroke }); }
    if (name === 'tokens') L.icon(g, 'tokens', 50, 50, 118, { color: color || 'ink2', w: 5 / 1.18 });
    if (name === 'click') E('path', { d: 'M26,10 L26,78 L42,63 L53,88 L64,83 L53,58 L74,58 Z' });
    if (name === 'sale') L.icon(g, 'coin', 50, 50, 100, { color: color || 'ink3', w: 5 });
    if (name === 'resolved') { L.icon(g, 'chat', 50, 57, 100, { color: color || 'ink2', w: 5 }); L.icon(g, 'check', 50, 50, 40, { color: 'teal', w: 8 }); }
  }
  const icon = (L, svg, name, x, y, size, color, o = {}) => {
    const g = L.g(svg, { transform: `translate(${x - size / 2},${y - size / 2}) scale(${size / 100})` });
    L.flags(g, o); drawIcon(L, g, name, color); return g;
  };

  let mk = [], qa, qr, qm;                               

  Deck.slide({
    id: 'M09B', section: 'Motivation', title: 'Why does this matter?', steps: 3,
    notes: [
  "Why does this choice matter? Because we've <b>seen it before</b>. Let's travel back <b>about 25 years</b>, to the early days of search ads. At first, Google sold impressions: the advertiser paid each time the ad was shown, whether or not <b>anyone</b> clicked.",
  "Then Google moved to pay per click: if your ad isn't clicked, you <b>don't</b> pay. With this <b>business model</b>, among other things, Google won the search ads market.",
  "AI services face the <b>same choice</b> today: pay per use, or pay per success. Will pay per success also win here, and <b>under what conditions</b>?",
  "AI companies compete not only on models, but also on business models. Under pay per success, the seller still pays to run a failed attempt, but <b>earns nothing</b> for it. <b>Right now</b>, this choice is being made in customer service."
],
    html: `
      <style>
        .slide[data-id="M09B"] .m9b-head { font-size: 40px; line-height: 1.2; white-space: nowrap; }
        .slide[data-id="M09B"] .m9b-era { font-size: 44px; line-height: 1.2; white-space: nowrap; }
        .slide[data-id="M09B"] .m9b-sub { font-size: 36px; line-height: 1.2; color: var(--ink2); white-space: nowrap; }
        .slide[data-id="M09B"] .m9b-node { font-size: 40px; line-height: 1.2; white-space: nowrap; background: var(--paper); padding: 0 8px; }
        .slide[data-id="M09B"] .m9b-cap { font-size: 36px; line-height: 1.25; color: var(--ink2); white-space: nowrap; text-align: center; background: var(--paper); padding: 0 8px; }
        .slide[data-id="M09B"] .m9b-res { font-size: 44px; line-height: 1.25; white-space: nowrap; }
        .slide[data-id="M09B"] .m9b-key { left: 120px; right: 120px; top: ${KEY}px; text-align: center; font-size: 48px; line-height: 1.2; }
      </style>
      <div class="abs m9b-key" data-in="3">The competition is not only on AI models, but also on <b>business models</b>.</div>
      <div class="source">Sources: Google press releases (<a href="http://googlepress.blogspot.com/2000/10/google-launches-self-service.html" target="_blank" rel="noopener">2000</a>, <a href="http://googlepress.blogspot.com/2002/02/google-introduces-new-pricing-for.html" target="_blank" rel="noopener">2002</a>); <a href="https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm" target="_blank" rel="noopener">Alphabet 10-K (2025)</a>.</div>`,
    init(el, L) {
      const svg = L.svg(el);
      // ---- two column heads only (no ladder): what the buyer pays for ----
      L.label(el, XU, YH, '<div class="m9b-head">pay for use</div>', { anchor: 'c', color: 'orange' });
      L.label(el, XO, YH, '<div class="m9b-head">pay for results</div>', { anchor: 'c', color: 'teal' });
      // ---- the two rows: each market moves from paying for use (orange) to paying for results (teal) ----
      const rows = [
        { y: Y1, era: 'Search ads', sub: '2000s', eraIcon: 'search', k: 1, from: XU, to: XO, nodes: [
            { x: XU, name: 'per impression', icon: 'eye', color: 'orange' },
            { x: XO, name: 'per click', icon: 'click', color: 'teal' }] },
        { y: Y2, era: 'AI services', sub: 'today', eraIcon: 'robot', k: 2, from: XU, to: XO, nodes: [
            { x: XU, name: 'per use', icon: 'tokens', color: 'orange' },    
            { x: XO, name: 'per success', icon: 'resolved', color: 'teal' }] }];
      mk = rows.map(r => {
         
        const P = r.k === 2 ? L.flags(L.g(svg), { in: 2 }) : svg, fin = o => (r.k === 2 ? Object.assign(o, { in: 2 }) : o);
        icon(L, P, r.eraIcon, 152, r.y - 4, 60, 'ink');
        L.label(el, 200, r.y - 4, `<div class="m9b-era">${r.era}</div><div class="m9b-sub">${r.sub}</div>`, fin({ anchor: 'l' }));
        L.line(P, X0, r.y, X1, r.y, { color: 'rule', w: 3 });
        r.nodes.forEach(n => {
          L.circle(P, n.x, r.y, 9, { fill: 'paper', color: 'ink3', w: 3 });
          icon(L, P, n.icon, n.x, r.y - IY, IS, n.color === 'ink3' ? 'ink3' : 'ink2');
          L.label(el, n.x, r.y + 40, n.name, fin({ anchor: 'ct', color: n.color, cls: 'm9b-node' }));
        });
        const trail = L.line(P, r.from, r.y, r.from, r.y, { color: 'teal', w: 6 });
        const ringO = L.ring(P, r.from, r.y, { color: 'orange', r: 27, w: 4.5 });
        const ringT = L.ring(P, r.from, r.y, { color: 'teal', r: 27, w: 4.5 });
        const dot = L.dot(P, r.from, r.y, { r: 11 });
        return { ringO, ringT, dot, trail, x0: r.from, x1: r.to, y: r.y };
      });
      // ---- click 1: Google's move (2002) and its result ----
      L.label(el, XR, Y1 - 4, '<div class="m9b-res">Google won<br>search ads</div><div class="m9b-sub" style="margin-top:6px">$295B in ads (2025)</div>', { anchor: 'l', in: 1 });
      // ---- click 2: AI services, the same choice today ----
      L.label(el, XR, Y2 - 4, '<div class="m9b-res">Will pay per success<br>also win here?</div>', { anchor: 'l', in: 2 });
      

      qa = L.arrow(svg, XU + 36, Y2, XO - 36, Y2, { color: 'teal', w: 5, head: 18, dash: '14 11' });
      qr = L.ring(svg, XO, Y2, { color: 'teal', r: 27, w: 4 }); qr.setAttribute('stroke-dasharray', '9 7');
      qm = L.label(el, (XU + XO) / 2, Y2 - 52, '?', { anchor: 'c', color: 'red', style: 'font-size:64px' });    
    },
    state: k => [{ m1: 0, m2: 0, q: 0 }, { m1: 1, m2: 0, q: 0 }, { m1: 1, m2: 0, q: 1 }, { m1: 1, m2: 0, q: 1 }][k],
    dur: k => [0, 1400, 1700, 600][k],
    draw(el, s, L) {
      [s.m1, s.m2].forEach((m, i) => {
        const r = mk[i]; if (!r) return;
        const x = L.mix(r.x0, r.x1, m);
        [r.ringO, r.ringT, r.dot].forEach(n => L.at(n, x, r.y));
        r.ringO.style.opacity = 1 - L.sub(m, 0.35, 0.9);    // the marker turns from orange (use) to teal (results)
        r.ringT.style.opacity = L.sub(m, 0.35, 0.9);
        L.seg(r.trail, r.x0, r.y, x, r.y); r.trail.style.opacity = m > 0.01 ? 1 : 0;
      });
      // the AI row's question: the dashed arrow draws towards per outcome, then the ring and the question mark
      if (!qa) return;
      const q = s.q, x2 = L.mix(XU + 36, XO - 36, L.sub(q, 0, 0.6));
      L.setArrow(qa, XU + 36, Y2, Math.max(XU + 37, x2), Y2); qa.style.opacity = q > 0.01 ? 1 : 0;
      qr.style.opacity = L.sub(q, 0.5, 0.8); qm.style.opacity = L.sub(q, 0.6, 1);
    }
  });
})();
