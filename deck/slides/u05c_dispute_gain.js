// The outcome-misalignment gain.
(function () {
  // ---- click 0: the decomposition (U05's markup) ----
  const EQT = 300;                                          // the equation's top
  // ---- the chart (left, large) ----
  const X0 = 240, Y0 = 870, PW = 600, PH = 580, EXT = 30;    
  const R0 = 0.28, R1 = 0.70, KB = 0.5;                     
  const X = k => X0 + k * PW, Y = r => Y0 - r * PH;
  const A = 0.3;                                            // the curve's starting slope, relative to its average rise
  const R = k => { const u = Math.min(k, KB) / KB; return R0 + (R1 - R0) * (A * u + (3 - 2 * A) * u * u + (A - 2) * u * u * u); };   // schematic: increasing, not concave
  // ---- the right column ----
  const CL = 1000;                                          // its left edge
  const WY = 152;                                           // "Why?" (top)
  const CY1 = 264, CY0 = 412, CYT = 338, CXT = CL + 420;    // the channel: row centres (true success, true failure, report); the report's left
  const NT = 530;    
  const NT0 = 300;   

  const KT = 590, KH = 242, KA = [CL, CL + 330], KBX = [CL + 450, 1810];    
  const HY = KT + 46, SY = KT + 86, RY = [KT + 148, KT + 198];               // the first card: title, its gloss, the two price rows (centres)
  const RB = [KT + 102, KT + 150, KT + 198];                                  // the second card's three rows (centres)
  const RT = KT + KH + 30, ET = RT + 83;                    

  const G0 = { x0: X0, y0: Y0, pw: PW, ph: PH, ly: 46, kl: 70 };
  const G1 = { x0: 860, y0: 824, pw: 800, ph: 370, ly: 36, kl: 22 };    
  const FL = 130, FT = 311, FR = 1790, FB = 901;            // the frame (symmetric about the stage's centre); ~25 px above / below its ink
  const DQT = 141;                                          // the decomposition above the frame (top): 37 px under the title, 36 px above the frame
  const RMT = 937;                                          // the remark below the frame (top): 37 px under the frame

  let eq, g2, w2, g3, w3, why, chan, chanA, sig, trick, cardA, cardB, trickA, trickB, same, rule, keyl;
  let ptA, ptB, lvl, ylab, aw, bw, curve, band, gain, tip, handle, box, fh, rm, cc, dq, axX, axY, yl, zero, kbl, moShown = 0;
  let pRow, qRow, pIc, qIc, fRow, arr, setG, setL;
  const AX = [KA[1] + 22, KBX[0] - 22], AY = KT + KH / 2;   
  const real = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);   // undo the engine's easing
  const sm = x => x * x * (3 - 2 * x);
  const ph = (e, a, b, L) => sm(L.sub(real(e), a, b));      // a phase of one click, in real time
  const M = t => `\\(${t}\\)`;
  const PFS = '\\class{c-teal}{R^{*}_{\\mathrm{PFS}}}', FAP = '\\class{c-teal}{R^{\\mathrm{fa}}_{\\mathrm{PFS}}}', FAL = 'R^{\\mathrm{fa}}_{\\mathrm{LL}}', UBP = '\\class{c-orange}{R^{*}_{\\mathrm{UBP}}}';
  const PP = '\\class{c-teal}{p_{\\mathrm{PFS}}}', S1 = '\\class{c-purple}{\\sigma^1}', S0 = '\\class{c-purple}{\\sigma^0}', OP = '\\class{c-orange}{p}', OQ = '\\class{c-orange}{q}';
  function paint(root, L, colors) { root.querySelectorAll('mjx-msubsup').forEach((n, i) => { if (colors[i]) n.style.color = L.C[colors[i]]; }); }

  Deck.slide({
    id: 'U05C', section: 'UBP vs. PFS', title: 'The outcome-misalignment gain', steps: 7,
    html: `
      <style>
        .slide[data-id="U05C"] .u5c-eq { position: absolute; left: 0; right: 0; top: ${EQT}px; display: flex; justify-content: center;
          align-items: baseline; font-size: 68px; white-space: nowrap; }
        .slide[data-id="U05C"] .u5c-eq .t { display: inline-flex; flex-direction: column; align-items: center; }
        .slide[data-id="U05C"] .u5c-eq .bl { width: 0; display: flex; flex-direction: column; align-items: center; margin-top: 14px; }
        .slide[data-id="U05C"] .u5c-eq .nm { font-size: 40px; line-height: 1.2; white-space: nowrap; color: var(--ink); }
        .slide[data-id="U05C"] .u5c-eq .gl { font-size: 36px; line-height: 1.3; white-space: nowrap; text-align: center;
          color: var(--ink2); margin-top: 16px; }
        .slide[data-id="U05C"] .u5c-ph { line-height: 1.25; }
        .slide[data-id="U05C"] .u5c-ph .k { font-size: 40px; color: var(--ink); }
        .slide[data-id="U05C"] .u5c-ph .d { font-size: 36px; color: var(--ink2); }
        /* the chart's label layer: a full-stage layer above the figure, so one transform moves it with the SVG group */
        .slide[data-id="U05C"] .u5c-w2 { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 2; transform-origin: 0 0; pointer-events: none; }
         
        .slide[data-id="U05C"] .u5c-fh { position: absolute; left: ${FL + 39}px; top: ${FT + 25}px; white-space: nowrap; z-index: 2; }
        .slide[data-id="U05C"] .u5c-fh .hd { font-size: 40px; line-height: 1.25; }
        .slide[data-id="U05C"] .u5c-fh .nmx { font-size: 36px; line-height: 1.3; color: var(--ink2); }
         
        .slide[data-id="U05C"] .u5c-dq { position: absolute; left: 0; right: 0; top: ${DQT}px; display: flex; justify-content: center;
          align-items: baseline; font-size: 44px; white-space: nowrap; z-index: 2; }
        .slide[data-id="U05C"] .u5c-dq .t { display: inline-flex; flex-direction: column; align-items: center; }
        .slide[data-id="U05C"] .u5c-dq .bl { width: 0; display: flex; flex-direction: column; align-items: center; margin-top: 8px; }
        .slide[data-id="U05C"] .u5c-dq .nm { font-size: 36px; line-height: 1.2; white-space: nowrap; color: var(--ink); }
         
        .slide[data-id="U05C"] .u5c-rm { position: absolute; left: ${FL + 39}px; top: 580px;    
          font-size: 38px; line-height: 1.3; white-space: nowrap; z-index: 2; }
        .slide[data-id="U05C"] .u5c-rm .ch { font-size: 42px; margin-top: 14px; }
        .slide[data-id="U05C"] .u5c-cc { position: absolute; left: 0; right: 0; top: ${RMT - 6}px; text-align: center; font-size: 40px; line-height: 1.3; white-space: nowrap; z-index: 2; }
      </style>
      <div data-in="0">
        <div class="u5c-eq">
          <span>\\(R^{*}_{\\mathrm{PFS}}-R^{*}_{\\mathrm{UBP}}=\\)</span>
          <span class="t" style="margin-left:0.2778em;opacity:var(--fade)">
            <span>\\(\\underbrace{\\big(R^{\\mathrm{fa}}_{\\mathrm{PFS}}-R^{*}_{\\mathrm{UBP}}\\big)}\\)</span>
            <span class="bl"><span class="nm">payment-base gap</span>
              <span class="gl">pay only for success vs. per use,<br>under full outcome alignment</span></span></span>
          <span style="margin:0 0.2222em">\\(+\\)</span>
          <span class="t">
            <span>\\(\\underbrace{\\big(R^{*}_{\\mathrm{PFS}}-R^{\\mathrm{fa}}_{\\mathrm{PFS}}\\big)}\\)</span>
            <span class="bl"><span class="nm">outcome-misalignment gain</span>
              <span class="gl">what a tuned metric<br>adds to PFS</span></span></span>
        </div>
        <div class="u5c-w2" style="opacity:0"></div>
        <div class="u5c-w3"></div>
        <div class="result u5c-box" style="left:${FL}px;top:${FT}px;width:${FR - FL}px;height:${FB - FT}px;opacity:0"></div>
        <div class="u5c-fh" style="opacity:0">
          <div class="hd"><span class="c-gold"><b>Theorem</b></span></div>
          <div class="nmx">(Outcome-misalignment gain)</div>
        </div>
        <div class="u5c-dq" style="opacity:0">
          <span>\\(R^{*}_{\\mathrm{PFS}}-R^{*}_{\\mathrm{UBP}}=\\)</span>
          <span class="t" style="margin-left:0.2778em;opacity:var(--fade)">
            <span>\\(\\underbrace{\\big(R^{\\mathrm{fa}}_{\\mathrm{PFS}}-R^{*}_{\\mathrm{UBP}}\\big)}\\)</span>
            <span class="bl"><span class="nm">payment-base gap</span></span></span>
          <span style="margin:0 0.75em">\\(+\\)</span>
          <span class="t">
            <span>\\(\\underbrace{\\big(R^{*}_{\\mathrm{PFS}}-R^{\\mathrm{fa}}_{\\mathrm{PFS}}\\big)}\\)</span>
            <span class="bl"><span class="nm">outcome-misalignment gain</span></span></span>
        </div>
        <div class="u5c-rm" style="opacity:0">    
          <div>When ${M('\\kappa_B')} is large enough,</div>
          <div class="ch">${M(`${PFS} = ${FAL} \\ge ${UBP}`)}</div>
        </div>
        <div class="u5c-cc" style="opacity:0">${M(UBP)} does not change with ${M('\\kappa_B')}</div>    
      </div>`,
    init(el, L) {
      const svg = L.svg(el), g0 = L.flags(L.g(svg), { in: 0 });   // everything fades in with the slide
      g2 = L.g(g0); g3 = L.g(g0); g2.style.opacity = 0;
      eq = el.querySelector('.u5c-eq'); w2 = el.querySelector('.u5c-w2'); w3 = el.querySelector('.u5c-w3');
      box = el.querySelector('.u5c-box'); fh = el.querySelector('.u5c-fh'); rm = el.querySelector('.u5c-rm'); cc = el.querySelector('.u5c-cc'); dq = el.querySelector('.u5c-dq');

      // ======== the chart: the seller's best PFS profit against the buyer's verification cost ========
      axX = L.arrow(g2, X0, Y0, X(1) + EXT + 8, Y0, { color: 'ink2', w: 3, head: 20 });
      axY = L.arrow(g2, X0, Y0, X0, Y(1) - EXT, { color: 'ink2', w: 3, head: 20 });
      yl = L.label(w2, X0 + 20, Y(1) - EXT - G0.ly, `${M(PFS)}&nbsp;&nbsp;<span style="font-size:36px;color:var(--ink2)">seller’s profit</span>`, { anchor: 'lb', style: 'font-size:40px' });
      zero = L.label(w2, X0, Y0 + 22, '0', { anchor: 'ct', color: 'ink2' });
      kbl = L.label(w2, X0 + PW / 2, Y0 + G0.kl, `${M('\\class{c-ink}{\\kappa_B}')} (buyer verification cost)`, { anchor: 'ct', color: 'ink2', style: 'font-size:40px' });
      // the gain band (click 7), under everything else
      band = L.path(g2, '', { fill: 'teal', fop: 0.1, color: 'none', w: 0 });
       
      gain = L.label(w2, X(0.72), Y((R0 + R1) / 2), 'gain', { anchor: 'c', color: 'teal', style: 'font-size:40px' });
      // the two levels: dashed lines, their names at the y-axis, and the words of each point
      lvl = [R0, R1].map(r => L.line(g2, X0, Y(r), X0, Y(r), { color: 'ink3', w: 2.5, dash: '10 9', cap: 'butt' }));
      ylab = [L.label(w2, X0 - 18, Y(R0), M(FAP), { anchor: 'r', style: 'font-size:40px' }),
              L.label(w2, X0 - 18, Y(R1), M(FAL), { anchor: 'r', style: 'font-size:40px' })];
      aw = L.label(w2, X0 + 24, Y(R0) + 18, `<div class="k" style="font-size:38px">${M('\\kappa_B = 0')}: checking is free</div><div class="d">so full outcome alignment is optimal</div>`, { anchor: 'lt', cls: 'u5c-ph' });
      bw = L.label(w2, X(1) + 6, Y(R1) - 16, `<div class="k">large ${M('\\kappa_B')}: the buyer never checks</div><div class="k">${M(`${PFS} = ${FAL}`)}</div>`, { anchor: 'rb', cls: 'u5c-ph', align: 'right' });
      // the curve, drawn behind the handle (click 7); the two points; the tip rides on the curve
      curve = L.path(g2, '', { color: 'teal', w: 5 });
      ptA = L.dot(g2, X0, Y(R0), { r: 12, fill: 'teal' });
      ptB = L.dot(g2, X(1), Y(R1), { r: 12, fill: 'teal' });
      tip = L.dot(g2, X0, Y(R0), { r: 12, fill: 'teal' });
      handle = L.dot(g2, X0, Y0, { r: 13, fill: 'ink' });

      // ======== "why": the metric channel (click 3), as in the video at 06:25 ========
      chan = [L.label(w3, CL, WY, 'Why?', { anchor: 'lt', style: 'font-size:44px' })];
      const node = (y, math, word, c) => [L.label(w3, CL, y, M(math), { anchor: 'l', color: c, style: 'font-size:44px' }),
                                         L.label(w3, CL, y + 30, word, { anchor: 'lt', color: c })];
      chan.push(...node(CY1, '\\omega=1', 'true success', 'green'), ...node(CY0, '\\omega=0', 'true failure', 'red'));
      chanA = [L.arrow(g3, CL + 136, CY1, CXT - 14, CYT - 9, { color: 'purple', w: 4, head: 20 }),
               L.arrow(g3, CL + 136, CY0, CXT - 14, CYT + 9, { color: 'purple', w: 4, head: 20 })];    
      const m1 = [(CL + 136 + CXT - 14) / 2, (CY1 + CYT - 9) / 2], m0 = [(CL + 136 + CXT - 14) / 2, (CY0 + CYT + 9) / 2];
      sig = [L.label(w3, m1[0], m1[1] - 14, M(S1), { anchor: 'cb', style: 'font-size:40px' }),
             L.label(w3, m0[0], m0[1] + 14, M(S0), { anchor: 'ct', style: 'font-size:40px' })];
      chan.push(L.label(w3, CXT, CYT, M('\\widehat\\omega=1'), { anchor: 'l', color: 'purple', style: 'font-size:44px' }),
                L.label(w3, CXT, CYT + 30, 'reported success', { anchor: 'lt', color: 'purple' }));

      

      cardA = L.g(g3); cardB = L.g(g3);
      trick = [L.label(w3, CL, NT, 'for illustration: one item', { anchor: 'lt', color: 'ink2' })];
      L.rect(cardA, KA[0], KT, KA[1] - KA[0], KH, { r: 18, color: 'ink3', w: 2.5 });
      L.rect(cardB, KBX[0], KT, KBX[1] - KBX[0], KH, { r: 18, color: 'ink3', w: 2.5 });
      const cA = (KA[0] + KA[1]) / 2, cB = (KBX[0] + KBX[1]) / 2;
      pIc = L.icon(cardA, 'check', 0, 0, 46, { color: 'green', w: 5.5 });
      qIc = L.icon(cardA, 'cross', 0, 0, 44, { color: 'red', w: 6 });
      pRow = L.label(w3, 0, RY[0], M(`${OP}=\\$10`), { anchor: 'l', style: 'font-size:40px' });
      qRow = L.label(w3, 0, RY[1], M(`${OQ}=\\$4`), { anchor: 'l', style: 'font-size:40px' });
      trickA = [L.label(w3, cA, HY, '<span class="c-orange">two prices</span>', { anchor: 'c', style: 'font-size:36px' }),
                L.label(w3, cA, SY, 'full outcome alignment', { anchor: 'c', color: 'ink2', style: 'font-size:28px' }),    
                pRow, qRow];
      fRow = [L.label(w3, 0, RB[0], M(`${PP}=\\$10`), { anchor: 'l', style: 'font-size:40px' }),
              L.label(w3, 0, RB[1], M(`${S1}=1`), { anchor: 'l', style: 'font-size:40px' }),
              L.label(w3, 0, RB[2], M(`${S0}=0.4`), { anchor: 'l', style: 'font-size:40px' })];
      trickB = [L.label(w3, cB, HY, '<span class="c-teal">PFS</span> + tuned <span class="c-purple">metric</span>', { anchor: 'c', style: 'font-size:36px' }), ...fRow];
      arr = L.arrow(g3, AX[0], AY, AX[1], AY, { color: 'ink3', w: 4, head: 22 });
      same = L.label(w3, (KA[1] + KBX[0]) / 2, AY - 10, 'same<br>effect', { anchor: 'cb', color: 'ink2', align: 'center', style: 'line-height:1.15' });    
      rule = L.label(w3, CL, RT, `${M(`${PP}=\\max\\{${OP},${OQ}\\}`)} and ${M(`(${S1},${S0})=(${OP},${OQ})/${PP}`)}`, { anchor: 'lt', color: 'ink2' });
      keyl = L.label(w3, CL, ET, M(`\\mathbb{E}[\\mathrm{payment}\\,|\\,\\mathrm{failure}]=\\class{c-purple}{0.4}\\times\\class{c-teal}{\\$10}=\\class{c-orange}{\\$4}=\\class{c-orange}{q}`), { anchor: 'lt', style: 'font-size:40px' });
      

      const PW2 = 365, GAP = 80, SXa = [1000, 1000 + PW2], SXb = [1000 + PW2 + GAP, 1000 + 2 * PW2 + GAP], STp = 196, SHh = 250;
      const cSa = (SXa[0] + SXa[1]) / 2, cSb = (SXb[0] + SXb[1]) / 2, cEq = (SXa[1] + SXb[0]) / 2, yEq = STp + SHh / 2;
      setG = L.g(g3);
      L.rect(setG, SXa[0], STp, PW2, SHh, { r: 22, fill: 'orange', fop: 0.09, color: 'none', w: 0 });    
      L.rect(setG, SXb[0], STp, PW2, SHh, { r: 22, fill: 'teal', fop: 0.09, color: 'none', w: 0 });
      L.line(setG, cEq - 20, yEq - 9, cEq + 20, yEq - 9, { color: 'ink2', w: 4.5, cap: 'round' });
      L.line(setG, cEq - 20, yEq + 9, cEq + 20, yEq + 9, { color: 'ink2', w: 4.5, cap: 'round' });
      setL = [
        L.label(w3, cSa, STp - 34, 'flexibility in pricing', { anchor: 'c', color: 'ink2', style: 'font-size:32px' }),
        L.label(w3, cSb, STp - 34, 'flexibility in information', { anchor: 'c', color: 'ink2', style: 'font-size:32px' }),
        L.label(w3, cSa, STp + 48, '<span class="c-orange">Two prices</span>', { anchor: 'c', style: 'font-size:36px' }),
        L.label(w3, cSa, STp + 104, `both prices ${M('\\ge 0')}`, { anchor: 'c', style: 'font-size:28px' }),
        L.label(w3, cSa, STp + 146, '<em>full</em> outcome alignment',    
        { anchor: 'c', style: 'font-size:28px' }),
        L.label(w3, cSa, STp + 206, M(FAL), { anchor: 'c', style: 'font-size:42px' }),
        L.label(w3, cSb, STp + 48, '<span class="c-teal">Pay only for success</span>', { anchor: 'c', style: 'font-size:36px' }),
        L.label(w3, cSb, STp + 104, `failure price ${M('= 0')}`, { anchor: 'c', style: 'font-size:28px' }),
        L.label(w3, cSb, STp + 146, '<em>any</em> outcome-alignment rule', { anchor: 'c', style: 'font-size:28px' }),
        L.label(w3, cSb, STp + 206, M(PFS), { anchor: 'c', style: 'font-size:42px' })];
      setL.forEach(n => { n.style.opacity = 0; }); setG.style.opacity = 0;
      [...chan, ...sig, ...trick, ...trickA, ...trickB, same, rule, keyl].forEach(n => { n.style.opacity = 0; });
      [...chanA, cardA, cardB, arr].forEach(n => { n.style.opacity = 0; });
    },
    after(el, L) {
      // after MathJax (the slide may be hidden): colour the decomposition as on U05, and centre each card's rows as one
      // left-aligned block
      paint(eq, L, ['teal', 'orange', 'teal', 'orange', 'teal', 'teal']);
      eq.querySelectorAll('mjx-under').forEach(u => { u.style.color = L.C.ink3; });
      paint(dq, L, ['teal', 'orange', 'teal', 'orange', 'teal', 'teal']);       // click 8's copy, the same colours
      dq.querySelectorAll('mjx-under').forEach(u => { u.style.color = L.C.ink3; });
      const was = el.style.display; el.style.display = 'block';
      try {
        const IW = 42, IG = 12, cA = (KA[0] + KA[1]) / 2, cB = (KBX[0] + KBX[1]) / 2;
        const wl = Math.max(pRow.offsetWidth, qRow.offsetWidth), x0 = cA - (IW + IG + wl) / 2;
        pIc.setAttribute('transform', `translate(${x0},${RY[0] - 5 - 21}) scale(0.42)`);
        qIc.setAttribute('transform', `translate(${x0 + 1},${RY[1] - 5 - 20}) scale(0.40)`);
        L.place(pRow, x0 + IW + IG, RY[0]); L.place(qRow, x0 + IW + IG, RY[1]);
        const wr = Math.max(...fRow.map(n => n.offsetWidth)), x1 = cB - wr / 2;
        fRow.forEach((n, j) => L.place(n, x1, RB[j]));
      } finally { el.style.display = was; }
    },
    notes: [
  "<b>Now</b> the <b>second part</b>: the outcome-misalignment gain.",
  "This is the seller's best profit under pay only for success, against the verification cost. If checking is free, <b>bending</b> the <b>metric</b> <b>adds nothing</b>.",
  "If checking is so costly that she never checks, pay only for success, with the right rule, <b>earns as much</b> as the best two-price contract. Flexibility in information is <b>as good as</b> flexibility in pricing.",
  "<b>Take</b> one item <b>with</b> two prices: $10 after a success, $4 after a failure.",
  "Under pay only for success, <b>charge</b> $10, and <b>report</b> a failure as a success with probability 0.4.",
  "After a true failure, she <b>still</b> pays $4 <b>on average</b>, because she never checks.",
  "<b>In general</b>, as checking gets costlier, the seller's best profit under pay only for success never <b>falls</b>.",
  "So when checking is costly enough, pay only for success earns at least as much as usage-based pricing, by <b>counting some failures</b> as successes. Why not charge for failures <b>openly</b>?"
],
    

    state: k => ({ s1: k >= 1 ? 1 : 0, s2: k >= 2 ? 1 : 0, s3: k >= 3 ? 1 : 0, s4: k >= 3 ? 1 : 0, s4b: k >= 4 ? 1 : 0, s4c: k >= 5 ? 1 : 0,
                   kap: k >= 6 ? 1 : 0, th: k >= 7 ? 1 : 0 }),
    dur: k => (k === 1 ? 2000 : k === 2 ? 1300 : k === 3 ? 1300 : k === 4 ? 1500 : k === 5 ? 900 : k === 6 ? 3200 : k === 7 ? 1600 : 1300),    
    draw(el, s, L) {
      const op = (n, v) => { n.style.opacity = (+v).toFixed(3); };
       
      const fo = ph(s.th, 0, 0.2, L), mo = ph(s.th, 0.05, 0.55, L);   // click 8: the long words fade, then the geometry morphs
      const G = {}; Object.keys(G0).forEach(q => { G[q] = G0[q] + (G1[q] - G0[q]) * mo; });
      const X = k => G.x0 + k * G.pw, Y = r => G.y0 - r * G.ph;
      if (mo > 0 || moShown > 0) {                        // only when click 8 has moved it (clicks 0-7 keep init()'s drawing)
        L.setArrow(axX, G.x0, G.y0, X(1) + EXT + 8, G.y0); L.setArrow(axY, G.x0, G.y0, G.x0, Y(1) - EXT);
        L.place(yl, G.x0 + 20, Y(1) - EXT - G.ly); L.place(zero, G.x0, G.y0 + 22); L.place(kbl, G.x0 + G.pw / 2, G.y0 + G.kl);
        L.place(ylab[0], G.x0 - 18, Y(R0)); L.place(ylab[1], G.x0 - 18, Y(R1));
        L.place(aw, G.x0 + 24, Y(R0) + 18); L.place(bw, X(1) + 6, Y(R1) - 16); L.place(gain, X(0.72), Y((R0 + R1) / 2));
        L.at(ptA, G.x0, Y(R0)); L.at(ptB, X(1), Y(R1));
        moShown = mo;
      }
      // ---- click 1: the decomposition leaves (0-0.35); the chart comes in (0.35-0.75); then the first point ----
      op(eq, 1 - ph(s.s1, 0, 0.35, L));
      const ch = ph(s.s1, 0.35, 0.75, L); op(g2, ch); op(w2, ch);
      const fa = L.sub(real(s.s1), 0.62, 1);
      const dimK = 1 - 0.72 * sm(L.sub(real(s.s2), 0.5, 0.9)) * (1 - ph(s.kap, 0, 0.25, L));    
      const a = sm(L.sub(fa, 0, 0.4)); op(ptA, a * dimK); ptA.setAttribute('r', (12 * (0.4 + 0.6 * a)).toFixed(2));
      L.seg(lvl[0], G.x0, Y(R0), L.mix(G.x0, X(1) + 10, sm(L.sub(fa, 0.1, 0.7))), Y(R0)); op(lvl[0], (fa > 0 ? 1 : 0) * dimK);
      op(ylab[0], sm(L.sub(fa, 0.4, 0.9)) * dimK); op(aw, sm(L.sub(fa, 0.5, 1)) * (1 - fo) * dimK);   

      const fb = real(s.s2), b = sm(L.sub(fb, 0, 0.35));
      op(ptB, b); ptB.setAttribute('r', (12 * (0.4 + 0.6 * b)).toFixed(2));
      L.seg(lvl[1], G.x0, Y(R1), L.mix(G.x0, X(1) + 10, sm(L.sub(fb, 0.1, 0.6))), Y(R1)); op(lvl[1], fb > 0 ? 1 : 0);
      op(ylab[1], sm(L.sub(fb, 0.45, 0.85))); op(bw, sm(L.sub(fb, 0.5, 1)) * (1 - fo));
      

      const f3 = real(s.s3), f4 = real(s.s4), f5 = real(s.s4b), f6 = real(s.s4c), out = 1 - ph(s.kap, 0, 0.25, L);
      const oc = out * (1 - 0.5 * sm(L.sub(f4, 0, 0.3))), ot = out;
      const sv = sm(L.sub(fb, 0.55, 1)) * out; op(setG, sv); setL.forEach(n => op(n, sv));    
      op(chan[0], 0);    
      chan.slice(1, 5).forEach(n => op(n, 0));    
      chanA.slice(0, 2).forEach(n => op(n, 0));
      sig.forEach(n => op(n, 0));
      chan.slice(5).forEach(n => op(n, 0));
       
      trick.forEach(n => op(n, sm(L.sub(f4, 0, 0.4)) * ot));
      op(cardA, sm(L.sub(f4, 0.2, 0.65)) * ot); trickA.forEach(n => op(n, sm(L.sub(f4, 0.25, 0.75)) * ot));
      // click 5: the arrow grows from the first card under "same effect"; the second card comes in at its tip; then the
      // construction under the cards
      const ga = sm(L.sub(f5, 0, 0.45));
      L.setArrow(arr, AX[0], AY, L.mix(AX[0], AX[1], ga), AY); op(arr, (ga > 0 ? 1 : 0) * ot);
      op(same, sm(L.sub(f5, 0.05, 0.4)) * ot);
      op(cardB, sm(L.sub(f5, 0.3, 0.65)) * ot); trickB.forEach(n => op(n, sm(L.sub(f5, 0.35, 0.7)) * ot));
      op(rule, sm(L.sub(f5, 0.6, 1)) * ot);
      // click 6: the key line
      op(keyl, sm(L.sub(f6, 0, 0.85)) * ot);
      // ---- click 7: once the panel has left, the handle sweeps the axis and the curve fills in behind it, rising, then flat ----
      const t = L.sub(real(s.kap), 0.2, 1), k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2;   // the sweep's own ease
      L.at(handle, X(k), G.y0); op(handle, t > 0 ? sm(L.sub(t, 0, 0.06)) * (1 - sm(L.sub(t, 0.9, 1))) : 0);   // only while it sweeps
      const n = Math.max(2, Math.round(90 * k)), pts = [];
      for (let i = 0; i <= n; i++) { const u = k * i / n; pts.push([X(u), Y(R(u))]); }
      const d = 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L');
      curve.setAttribute('d', k > 0.002 ? d : '');
      band.setAttribute('d', k > 0.002 ? d + `L${X(k).toFixed(1)},${Y(R0).toFixed(1)}Z` : '');
      L.at(tip, X(k), Y(R(k))); op(tip, k > 0.002 ? 1 : 0);
      op(gain, sm(L.sub(t, 0.72, 1)));
      

      op(box, ph(s.th, 0.45, 0.7, L)); op(fh, ph(s.th, 0.5, 0.75, L)); op(dq, ph(s.th, 0.6, 0.8, L)); op(rm, ph(s.th, 0.68, 0.88, L)); op(cc, ph(s.th, 0.82, 1, L));    
    }
  });
})();
