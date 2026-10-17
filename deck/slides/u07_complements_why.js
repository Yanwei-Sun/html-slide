// Complements or substitutes: which format wins?.
(function () {
  const LO = 1.02, HI = 3.17, G = [0.40, 0.80], PI = [0.90, 0.10], C0 = 0.10;
  const HX = 3.0;                                         
  const GBAR = PI[0] * G[0] + PI[1] * G[1];
  const Cq = r => r * r / (1 - r);                       // congestion cost rate of an M/M/1 queue at utilization r (lambda = h0 = 1)
  const V = (rho, g) => Cq(rho) - Cq((1 - g) * rho);     // the value: the cost saved when the AI cuts utilization to (1 - g) rho
  const v1Of = m1 => V(1 / m1, G[0]), v2Of = m2 => V(1 / m2, G[1]);
  function winner(m1, m2) {                              // +1 PFS earns more, -1 UBP earns more, 0 the same
    const v = [v1Of(m1), v2Of(m2)], f = [v[0] / G[0], v[1] / G[1]];
    const ubp = p => PI[0] * (p - C0) * (v[0] >= p - 1e-12) + PI[1] * (p - C0) * (v[1] >= p - 1e-12);
    const pfs = p => PI[0] * (G[0] * p - C0) * (f[0] >= p - 1e-12) + PI[1] * (G[1] * p - C0) * (f[1] >= p - 1e-12);
    const U = Math.max(0, ubp(v[0]), ubp(v[1])), P = Math.max(0, pfs(f[0]), pfs(f[1]));
    const r = Math.log2(P / U);
    return r > 1e-9 ? 1 : r < -1e-9 ? -1 : 0;
  }
  function column(m1) {
    const M = 200, runs = [];
    let prev = winner(m1, LO), a = LO, yp = LO;
    for (let j = 1; j <= M; j++) {
      const y = LO + (HI - LO) * j / M, c = winner(m1, y);
      if (c !== prev) {
        let lo = yp, hi = y;
        for (let it = 0; it < 28; it++) { const mid = (lo + hi) / 2; if (winner(m1, mid) === prev) lo = mid; else hi = mid; }
        const b = (lo + hi) / 2; runs.push({ c: prev, a, b }); prev = c; a = b;
      }
      yp = y;
    }
    runs.push({ c: prev, a, b: HI });
    const T = runs.find(r => r.c === 1), O = runs.find(r => r.c === -1);
    const o0 = O ? O.a : (T ? T.b : HI), o1 = O ? O.b : o0;
    return { t0: T ? T.a : o0, t1: T ? T.b : o0, o0, o1 };
  }
  const vDag = m1 => { const v1 = v1Of(m1); return Math.max(G[1] / GBAR * v1, G[1] / G[0] * Math.min(v1, C0)); };
  function fDag(m1) {
    const t = vDag(m1); let lo = 1 + 1e-9, hi = 1e4;
    for (let it = 0; it < 90; it++) { const mid = (lo + hi) / 2; if (v2Of(mid) > t) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  const tint = (hex, t) => {
    const n = parseInt(hex.replace('#', ''), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
    return 'rgb(' + c.map(x => Math.round(255 + (x - 255) * t)).join(',') + ')';
  };
  const real = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
  const smooth = x => x * x * (3 - 2 * x);
  const ph = (e, a, b) => smooth(Math.min(1, Math.max(0, (real(e) - a) / (b - a))));

  // ---- the map, wide on the left; the words in one column on the right ----
  const X0 = 150, SW = 660, Y0 = 910, SH = 640;           
  const MX = m => X0 + (m - LO) / (HX - LO) * SW, MY = m => Y0 - (m - LO) / (HI - LO) * SH;
  const RX = 980;                                        // the text column
  const KY = [808, 862, 916];                            // the key's rows; CM words sit high, so each word is set 12 px (font / 3) lower
  const N = {};
  

  const AT = 52, AD = 50, AO = 11, AG = 8, AA = 26;       // tile (1.05 x the person, as L.csflow), person, overlap, gaps, arrow
  const AX = 18, AY = 10;                                // pair-to-word gap; the pair's centre above the baseline
  function pair(L, host) {                                
    const C = L.C, cy = AT / 2, AM = 26, w = AT + 2 * AG + AM + AD, hx = w - AD / 2, s = d => (d / 640).toFixed(5);
    host.style.width = w + 'px';
    const svg = L.el(host, 'svg', { width: w, height: AT, viewBox: `0 0 ${w} ${AT}` });
    L.el(svg, 'rect', { x: 0, y: 0, width: AT, height: AT, rx: 0.18 * AT, fill: tint(C.ink, 0.045) });
    L.el(svg, 'image', { href: 'assets/cs/bust/ai_agent.png', width: 640, height: 640, transform: `translate(${AT / 2},${cy}) scale(-${s(AT)},${s(AT)}) translate(-320,-320)` });
    const amp = L.el(svg, 'text', { x: AT + AG + AM / 2, y: cy + 13, 'text-anchor': 'middle', 'font-size': 38, fill: C.ink2 });
    amp.textContent = '&';
    L.el(svg, 'circle', { cx: hx, cy, r: AD / 2 + 3, fill: C.paper });
    L.el(svg, 'circle', { cx: hx, cy, r: AD / 2, fill: '#EEF3F1' });
    L.el(svg, 'image', { href: 'assets/cs/bust/staff.png', width: 640, height: 640, transform: `translate(${hx},${cy}) scale(-${s(AD)},${s(AD)}) translate(-320,-320)` });
    L.el(svg, 'circle', { cx: hx, cy, r: AD / 2 - 0.875, fill: 'none', stroke: '#BEC3C1', 'stroke-width': 1.75 });
  }


  Deck.slide({
    id: 'U07', section: 'UBP vs. PFS: application to customer service', title: 'Complements or substitutes: which format wins?', steps: 2,
    notes: [
  "Take two types of <b>firm</b>, <b>and say</b> the AI is better at type 2's tasks.",
  "AI and human staff are complements when the AI is strong where type 2's staff are slow: <b>below</b> the <b>dashed line</b>. <b>Above it</b>, type 2's staff are fast too, and they're substitutes.",
  "Complements favor pay only for success: the AI <b>succeeds most</b> where each success <b>saves</b> the <b>most waiting</b>. Substitutes favor usage-based pricing."
],
    html: `
      <style>
        .slide[data-id="U07"] .u7-col { position: absolute; left: ${RX}px; white-space: nowrap; }
        .slide[data-id="U07"] .u7-col .d { font-size: 40px; line-height: 1.3; }
        .slide[data-id="U07"] .u7-col .g { font-size: 36px; line-height: 1.3; color: var(--ink2); margin-top: 4px; }
        .slide[data-id="U07"] .u7-key { position: absolute; left: ${RX + 62}px; font-size: 36px; line-height: 1; transform: translateY(-50%); white-space: nowrap; }
        .slide[data-id="U07"] .u7-pair { display: inline-block; position: relative; height: 0; margin-right: ${AX}px; }
        .slide[data-id="U07"] .u7-pair svg { position: absolute; left: 0; top: ${-AY - AT / 2}px; }
      </style>
      <div class="u7-col" style="top:238px">
        <div class="d"><b>Binary types</b>: without loss, <span class="c-gold">\\(\\gamma_2 \\gt \\gamma_1\\)</span></div>
        <div class="g">• the AI is better at type 2’s tasks than at type 1’s</div></div>
      <div class="u7-col" style="top:377px" data-in="1">
        <div class="d"><span class="u7-pair"></span><b>Complements</b></div>
        <div class="g">type 2’s tasks: AI strong, humans (relatively) slow</div>
        <div class="d" style="margin-top:45px"><span class="u7-pair" data-apart="1"></span><b>Substitutes</b></div>
        <div class="g">type 2’s tasks: AI strong, humans (relatively) fast</div></div>
      <div class="u7-col" style="top:694px" data-in="2">
        <div class="d">Complements favor <span class="c-teal">PFS</span>, substitutes favor <span class="c-orange">UBP</span></div></div>
      <div class="u7-key" style="top:${KY[0] + 12}px" data-in="2"><span class="c-teal">PFS</span> earns more</div>
      <div class="u7-key" style="top:${KY[1] + 12}px" data-in="2"><span class="c-orange">UBP</span> earns more</div>
      <div class="u7-key" style="top:${KY[2] + 12}px" data-in="2">same profit</div>
`,
    init(el, L) {
      const svg = L.svg(el);
      const teal = tint(L.C.teal, 0.34), orange = tint(L.C.orange, 0.32);
      // ---- the map: regions (click 2), frame, the threshold f (click 1), axes, region names (click 1) ----
      const n = 300, cols = [];
      for (let i = 0; i <= n; i++) { const m1 = LO + (HX - LO) * i / n; cols.push(Object.assign({ m1 }, column(m1))); }
      const d = 3 / SH * (HI - LO);
      const edge = k => cols.map(c => [MX(c.m1), MY(c[k])]);
      const oBot = cols.map(c => [MX(c.m1), MY(Math.max(c.t0, c.t1 - d))]).reverse();
      N.reg = L.flags(L.g(svg), { in: 2 });
      L.poly(N.reg, edge('o1').concat(oBot), { fill: orange, color: 'none', close: true });
      L.poly(N.reg, edge('t1').concat(edge('t0').reverse()), { fill: teal, color: 'none', close: true });
      L.line(svg, X0, Y0 - SH, X0 + SW, Y0 - SH, { color: 'ink3', w: 2, cap: 'butt' });
      L.line(svg, X0 + SW, Y0 - SH, X0 + SW, Y0, { color: 'ink3', w: 2, cap: 'butt' });
      const cut = [];
      for (let i = 0; i <= 400; i++) { const m1 = LO + (HX - LO) * i / 400, f = fDag(m1); if (f >= LO && f <= HI) cut.push([MX(m1), MY(f)]); }
      N.cut = L.poly(svg, cut, { color: 'ink', w: 4, dash: '14 10' });
      N.cut.setAttribute('pathLength', '1');
      const fEnd = cut[cut.length - 1];
      N.fLab = { style: {} };    
      const ax = L.axes(el, L.plot({ x0: X0, y0: Y0, w: SW, h: SH }), { x: '\\(\\mu_1\\)', xNote: "type 1’s human service rate", y: '\\(\\mu_2\\)', yNote: "type 2’s human service rate", yNoteDx: 70, origin: false });
      ax.labels.forEach((l, i) => { l.style.fontSize = i % 2 ? '36px' : '42px'; });
       
      const pill = 'text-shadow:0 0 2px var(--paper),0 0 4px var(--paper),0 0 7px var(--paper),0 0 11px var(--paper),0 0 16px var(--paper)';
      L.label(el, 478, 812, 'complements', { anchor: 'c', color: 'ink', in: 1, style: 'font-size:40px;' + pill });   // below f (on the teal band), 70 px left of the slice
      L.label(el, MX(1.62), MY(2.72), 'substitutes', { anchor: 'c', color: 'ink', in: 1, style: 'font-size:40px;' + pill });  // above f
      // the legend swatches (click 2)
      [teal, orange, L.C.paper].forEach((f, i) => L.rect(svg, RX, KY[i] - 20, 42, 40, { r: 6, fill: f, color: i === 2 ? 'ink3' : 'none', w: 2, in: 2 }));
       
      el.querySelectorAll('.u7-pair').forEach(s => pair(L, s, !!s.dataset.apart));
       
    },
    // cu: the threshold draws (click 1); the regions fade in by data-in (click 2)
    state: k => ({ cu: k >= 1 ? 1 : 0 }),
    dur: k => (k === 1 ? 1400 : 900),
    draw(el, s, L) {
      if (!N.cut) return;
      N.cut.setAttribute('stroke-dasharray', `${(0.016).toFixed(3)} ${(0.0095).toFixed(4)}`);
      const grow = ph(s.cu, 0, 0.85);
      N.cut.style.opacity = grow > 0.001 ? 1 : 0;
      N.cut.style.clipPath = `inset(0 ${(100 * (1 - grow)).toFixed(1)}% 0 0)`;
      N.fLab.style.opacity = ph(s.cu, 0.8, 1);
    }
  });
})();
