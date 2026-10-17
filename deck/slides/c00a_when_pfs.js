// When does pay-only-for-success work?.
(function () {
  // ---- left: success value rising with success probability (U02T's right panel) ----
  const G = [0.2, 0.35, 0.5, 0.65, 0.8];
  const rise = g => 0.35 + 0.75 * Math.pow(g, 1.5);
  const PX0 = 170, PY0 = 820, PW = 560, PH = 300;   

  const LO = 1.02, HI = 3.17, GM = [0.40, 0.80], PI = [0.90, 0.10], C0 = 0.10, HX = 3.0;
  const GBAR = PI[0] * GM[0] + PI[1] * GM[1];
  const Cq = r => r * r / (1 - r);
  const V = (rho, g) => Cq(rho) - Cq((1 - g) * rho);
  const v1Of = m1 => V(1 / m1, GM[0]), v2Of = m2 => V(1 / m2, GM[1]);
  function winner(m1, m2) {
    const v = [v1Of(m1), v2Of(m2)], f = [v[0] / GM[0], v[1] / GM[1]];
    const ubp = p => PI[0] * (p - C0) * (v[0] >= p - 1e-12) + PI[1] * (p - C0) * (v[1] >= p - 1e-12);
    const pfs = p => PI[0] * (GM[0] * p - C0) * (f[0] >= p - 1e-12) + PI[1] * (GM[1] * p - C0) * (f[1] >= p - 1e-12);
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
  const vDag = m1 => { const v1 = v1Of(m1); return Math.max(GM[1] / GBAR * v1, GM[1] / GM[0] * Math.min(v1, C0)); };
  function fDag(m1) {
    const t = vDag(m1); let lo = 1 + 1e-9, hi = 1e4;
    for (let it = 0; it < 90; it++) { const mid = (lo + hi) / 2; if (v2Of(mid) > t) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  const tint = (hex, t) => {
    const n = parseInt(hex.replace('#', ''), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
    return 'rgb(' + c.map(x => Math.round(255 + (x - 255) * t)).join(',') + ')';
  };
  const X0 = 1240, SW = 520, Y0 = 905, SH = 450;    
  const MX = m => X0 + (m - LO) / (HX - LO) * SW, MY = m => Y0 - (m - LO) / (HI - LO) * SH;

  Deck.slide({
    id: 'C00A', section: 'Conclusion', title: 'When does pay-only-for-success work?', steps: 0,
    notes: [
  "When does pay only for success work? With accurate reports, when the high-value tasks are the ones easy for AI. In customer service, that's when AI and human staff are complements. But <b>I'd argue</b> that's not the natural case, so pay only for success is <b>risky</b> for the seller."
],
    html: `
      <style>
        .slide[data-id="C00A"] .c0a-t { position: absolute; top: 168px; font-size: 42px; line-height: 1.3; white-space: nowrap; }
        .slide[data-id="C00A"] .c0a-t::before { content: ''; position: absolute; left: -38px; top: 22px; width: 12px; height: 12px; border-radius: 50%; background: var(--ink3); }
      </style>
      <div class="c0a-t" style="left:130px">When the high-value tasks are<br>the ones easy for AI.</div>
      <div class="c0a-t" style="left:1150px">In customer service: when AI and<br>human staff are complements.</div>`,
    init(el, L) {
      const svg = L.svg(el);
      // ---- left: rising success value ----
      const P = L.plot({ x0: PX0, y0: PY0, w: PW, h: PH });
      const ax = L.axes(el, P, { x: '\\(\\gamma_t(a)\\)', xColor: 'gold', y: '\\(\\widetilde v_t(\\mathrm{success})\\)', yColor: 'teal', yNote: 'success value', yNoteDx: 236 });
      const [l0, lx, ly, lyn] = ax.labels;
      lx.style.fontSize = ly.style.fontSize = '40px'; lyn.style.fontSize = '36px';
      l0.style.fontSize = '36px'; l0._anchor = [-50, 0]; L.place(l0, PX0, PY0 + 12);
      const pts = []; for (let i = 0; i <= 60; i++) { const x = 0.17 + (0.86 - 0.17) * i / 60; pts.push(P.pt(x, rise(x))); }
      L.poly(svg, pts, { color: 'teal', w: 4 });
      G.forEach(g => L.dot(svg, P.X(g), P.Y(rise(g)), { r: 10 }));
      // ---- right: the map ----
      const teal = tint(L.C.teal, 0.34), orange = tint(L.C.orange, 0.32);
      const n = 300, cols = [];
      for (let i = 0; i <= n; i++) { const m1 = LO + (HX - LO) * i / n; cols.push(Object.assign({ m1 }, column(m1))); }
      const d = 3 / SH * (HI - LO);
      const edge = k => cols.map(c => [MX(c.m1), MY(c[k])]);
      const oBot = cols.map(c => [MX(c.m1), MY(Math.max(c.t0, c.t1 - d))]).reverse();
      const reg = L.g(svg);
      L.poly(reg, edge('o1').concat(oBot), { fill: orange, color: 'none', close: true });
      L.poly(reg, edge('t1').concat(edge('t0').reverse()), { fill: teal, color: 'none', close: true });
      L.line(svg, X0, Y0 - SH, X0 + SW, Y0 - SH, { color: 'ink3', w: 2, cap: 'butt' });
      L.line(svg, X0 + SW, Y0 - SH, X0 + SW, Y0, { color: 'ink3', w: 2, cap: 'butt' });
      const cut = [];
      for (let i = 0; i <= 400; i++) { const m1 = LO + (HX - LO) * i / 400, f = fDag(m1); if (f >= LO && f <= HI) cut.push([MX(m1), MY(f)]); }
      L.poly(svg, cut, { color: 'ink', w: 4, dash: '14 10' });
      const fEnd = cut[cut.length - 1];
      const ax2 = L.axes(el, L.plot({ x0: X0, y0: Y0, w: SW, h: SH }), { x: '\\(\\mu_1\\)', xNote: 'type 1’s human service rate', y: '\\(\\mu_2\\)', yNote: 'type 2’s human service rate', yNoteDx: 62, origin: false });
      ax2.labels.forEach((l, i) => { l.style.fontSize = i % 2 ? '34px' : '40px'; });
      const pill = 'text-shadow:0 0 2px var(--paper),0 0 4px var(--paper),0 0 7px var(--paper),0 0 11px var(--paper),0 0 16px var(--paper)';
      L.label(el, X0 + 0.5 * SW, Y0 - 0.15 * SH, 'complements', { anchor: 'c', color: 'ink', style: 'font-size:36px;' + pill });
      L.label(el, MX(1.62), MY(2.72), 'substitutes', { anchor: 'c', color: 'ink', style: 'font-size:36px;' + pill });
    }
  });
})();
