// Which format wins?.
(function () {
  const BX = 200, BY = 160, BW = 1520, BH = 740;      
  const PAD = 40;                                     // the text's inset
  const COL = [BX + 100, BX + BW / 2 + 70];          // each panel's y-axis (the captions start there too)
  const FY0 = 692, FW = 430, FH = 230, EXT = 40;      

  const CY = 768;                                      
  const G = [0.2, 0.35, 0.5, 0.65, 0.8];              // the types' success probabilities (both panels)
  const G0 = G[0], W0 = 0.9;
  const fall = g => W0 * Math.pow(G0 / g, 1.8);       // left: success value falls faster than the same-value curve
  const rise = g => 0.35 + 0.75 * Math.pow(g, 1.5);    
  const W1 = rise(G0);                                // the flat level of the same success value, through the first dot
  const sameV = g => W0 * G0 / g;                     // the same-value curve through the first dot (U02's clicks 6-7)

  Deck.slide({
    id: 'U02T', section: 'UBP vs. PFS', title: 'Which format wins?', steps: 0,
    notes: [
  "Both extremes generalize, under a separability condition. If success value falls with success probability, <b>fast enough</b> that expected value falls too, usage-based pricing does at least as well. If it rises, pay only for success does. <b>I'd argue</b> the first is more natural: a task that's hard for AI is usually hard <b>for humans too</b>, and more valuable to solve."
],
    html: `
      <style>
        .slide[data-id="U02T"] .u2t-box { padding: 0; }
        .slide[data-id="U02T"] .u2t-th { position: absolute; font-size: 40px; line-height: 1.3; }
        .slide[data-id="U02T"] .u2t-inf { color: var(--ink); font-size: 36px; }
        .slide[data-id="U02T"] .u2t-sub { position: absolute; font-size: 36px; line-height: 1.3; color: var(--ink2); }
        .slide[data-id="U02T"] .u2t-cap { position: absolute; font-size: 40px; line-height: 1.3; white-space: nowrap; text-align: center; transform: translateX(-50%); }
        .slide[data-id="U02T"] .u2t-cap .u2t-v { margin-top: 10px; }
      </style>
      <div class="result u2t-box" style="left:${BX}px;top:${BY}px;width:${BW}px;height:${BH}px"></div>
      <div class="u2t-th" style="left:${BX + PAD}px;top:${BY + 24}px"><span class="c-gold"><b>Theorem</b></span> <span class="u2t-inf">[informal]</span></div>
      <div class="u2t-sub" style="left:${BX + PAD}px;top:${BY + 80}px">Payment-base gap: UBP vs. PFS, under full outcome alignment</div>
       
      <div class="u2t-cap" style="left:${COL[0] + FW / 2 + 20}px;top:${CY}px">
        <div>success value <b>falls</b></div>
        <div class="u2t-v">\\(\\Longrightarrow\\)&nbsp; favors <span class="c-orange">UBP</span></div></div>
      <div class="u2t-cap" style="left:${COL[1] + FW / 2 + 20}px;top:${CY}px">
        <div>success value <b>rises</b></div>
        <div class="u2t-v">\\(\\Longrightarrow\\)&nbsp; favors <span class="c-teal">PFS</span></div></div>
`,
    init(el, L) {
      const svg = L.svg(el);
      // where a falling curve enters the panel (height 1), by bisection; a curve that starts inside starts at 0.17
      const enter = f => { if (f(0.17) <= 1) return 0.17; let a = 0.17, b = 0.9; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(m) > 1) a = m; else b = m; } return b; };
      // one panel: the success value against the success probability, with a dashed extreme-case reference
      const panel = (x0, f, ref, refLab, labAt, o) => {
        const P = L.plot({ x0, y0: FY0, w: FW, h: FH });
         
        const ax = L.axes(el, P, { x: '\\(\\gamma_t(a)\\)', xColor: 'gold', y: '\\(\\widetilde v_t(\\mathrm{success})\\)', yColor: 'teal', yNote: 'success value', yNoteDx: 236, flags: o });
        const [l0, lx, ly, lyn] = ax.labels;
        lx.style.fontSize = ly.style.fontSize = '40px'; lyn.style.fontSize = '36px';
        l0.style.fontSize = '36px'; l0._anchor = [-50, 0]; L.place(l0, x0, FY0 + 12);   // the origin's 0 under the corner, as on U02
        const pts = (g, a, b) => { const q = []; for (let i = 0; i <= 60; i++) { const x = a + (b - a) * i / 60; q.push(P.pt(x, g(x))); } return q; };
        if (ref) {    
          L.poly(svg, pts(ref, enter(ref), 0.95), Object.assign({ color: 'ink3', w: 3, dash: '10 9' }, o));
          L.label(el, labAt[0](P), labAt[1](P), refLab, Object.assign({ anchor: labAt[2], color: 'ink2' }, o));
        }
        L.poly(svg, pts(f, enter(f), 0.86), Object.assign({ color: 'teal', w: 4 }, o));
        G.forEach(g => L.dot(svg, P.X(g), P.Y(f(g)), Object.assign({ r: 10 }, o)));
        return P;
      };
      // left (click 0): falls below the same-value curve. Both curves start where they enter the panel (height 1); the
      // label sits right-aligned at the curve's end, its bottom 8 px above the curve under its left edge (175 px wide)
      panel(COL[0], fall, null, null, null, { in: 0 });   

      panel(COL[1], rise, null, null, null, { in: 0 });
      // checks: the left panel's value v = gamma v~ falls (the theorem's UBP case), the right panel's success value rises
      const v = G.map(g => g * fall(g)), r = G.map(rise);
      if (!(v.every((x, i) => i === 0 || x < v[i - 1]) && r.every((x, i) => i === 0 || x > r[i - 1]))) console.warn('U02T: check the two panels');
    }
  });
})();
