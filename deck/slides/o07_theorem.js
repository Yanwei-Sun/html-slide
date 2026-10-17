// The optimal contract.
(function () {
  const BX = 120, BY = 160, BW = 1680;               // theorem box: the full band (its widest line, the assumption, nearly fills it)
  const TL = 175;                                    // text edge in the box; the bullets' text starts 50 px further in
  const HY = 186, AY = 237;                          // tops of the header and the assumption line
  const S = [304, 481, 550];                         // text tops of the three statements
  const BOT = [472, 541, 668];                       // box bottom with 1, 2, 3 statements (ink pad ~24 px, as at the top)
  const RX = 930, CY = 700;                          // comparison, outside the theorem box
  // chart: capability by type; the value order is the same as the task-ease order (as in the paper's figure)
  const TX = [0.08, 0.29, 0.50, 0.71, 0.92];
  const FB = [0.26, 0.40, 0.50, 0.63, 0.84];         // first best
  const SB = [0.26, 0.53, 0.37, 0.52, 0.84];         // optimal contract: endpoints first best, interior up or down (type 4 clear of its ring)
  const SD = [0.08, 0.15, 0.24, 0.38, 0.84];         

  const SQ = 'M-7.5,-7.5H7.5V7.5H-7.5Z', TRI = 'M0,-13.5L11.69,6.75L-11.69,6.75Z';
  const mark = (L, p, d, c, x, y) => L.at(L.path(p, d, { color: c, fill: c, w: 2 }), x, y);
  let P, fbP, sbLine, sbDots, sdLine, sdDots;

  const OR = x => String.raw`\mmlToken{mi}[class="c-orange"]{${x}}`;
  const M = t => `\\(${t}\\)`;
  const BILL = String.raw`\bigl[(1-\gamma_t(a_r))\,${OR('q')}_{${OR('r')}}+\gamma_t(a_r)\,${OR('p')}_{${OR('r')}}\bigr]`;
  const pathOf = pts => 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L');

  Deck.slide({
    id: 'O07', section: 'Optimal mechanism', title: 'The optimal contract', steps: 2,
    notes: [
  "What does the optimal contract look like? Suppose success probability is task ease times AI quality, with positive quality at every capability. When <b>both ends</b> can be <b>served profitably</b>, the buyers with the hardest and the easiest tasks get first-best capability. That's what the seller would choose if it <b>knew their</b> type.",
  "Everyone <b>in between</b> can <b>end up</b> above first best or below it.",
  "That's a <b>sharp contrast</b> with standard price discrimination, where only the highest-value buyer <b>is sure</b> to get first best."
],
    html: `
      <style>
        .slide[data-id="O07"] .o7box { padding: 0; }
        .slide[data-id="O07"] .o7head { font-size: 40px; line-height: 1.3; }
        .slide[data-id="O07"] .o7assume { font-size: 36px; line-height: 1.3; white-space: nowrap; }
        .slide[data-id="O07"] .o7bullet { font-size: 44px; line-height: 1.3; white-space: nowrap; }
        .slide[data-id="O07"] .o7bullet::before { content: '•'; position: absolute; left: -44px; color: var(--gold); }
        .slide[data-id="O07"] .o7endpoint-math { width: 1480px; margin-top: 6px; font-size: 44px; line-height: 1.2; white-space: normal; }
        .slide[data-id="O07"] .o7endpoint-math mjx-container[display="true"] { margin: 0 !important; }
        .slide[data-id="O07"] .o7sub { margin-top: 8px; font-size: 36px; line-height: 1.3; }
        .slide[data-id="O07"] .hl { position: relative; display: inline-block; }
        .slide[data-id="O07"] .hl svg { position: absolute; left: 4px; bottom: -22px; width: calc(100% - 8px); height: 12px; overflow: visible; }
        .slide[data-id="O07"] .hl line { stroke: var(--orange); stroke-width: 3.5; stroke-linecap: round; }
      </style>
      <div class="result o7box" style="left:${BX}px;top:${BY}px;width:${BW}px;height:${BOT[0] - BY}px"></div>
      <div class="abs o7head" style="left:${TL}px;top:${HY}px"><span class="c-gold"><b>Theorem</b></span></div>
      <div class="abs o7assume c-ink2" style="left:${TL}px;top:${AY}px">Suppose ${M(String.raw`\gamma_t(a)=\alpha_t\,s(a)`)} (task ease ${M(String.raw`\times`)} AI quality), with types ordered by task ease: ${M(String.raw`\alpha_1\lt\dots\lt\alpha_n`)}.</div>
      <div class="abs o7bullet" style="left:${TL + 50}px;top:${S[0]}px" data-dim="3">
        Buyers with the <b>hardest</b> and the <b>easiest</b> tasks for AI get <span class="c-green">first-best</span> capability:
        <div class="o7endpoint-math">${String.raw`\[a_t^{\mathrm{SB}}=a_t^{\mathrm{FB}}\in\arg\max_{a\in\mathcal A}\{v_t(a)-c(a)\},\qquad t\in\{1,n\}\]`}</div></div>
      <div class="abs o7bullet o7r2" style="left:${TL + 50}px;top:${S[1]}px" data-dim="3">
        Every other buyer’s capability can lie <b>above or below</b> first best.</div>
      <div class="abs o7bullet o7r3" style="left:${TL + 50}px;top:${S[2]}px">
        <b>Convex reformulation</b>, based on the geometry of IC constraints.
        <div class="o7sub c-ink2">With separable values and convex transformed cost and domain.</div></div>
      <div class="abs body o7con" style="left:${RX}px;top:${CY}px;white-space:nowrap">
        <span class="c-orange">Standard price discrimination</span> without outcomes:<br>only the <b style="white-space:nowrap">highest-value</b> buyer gets first best;<br>all others get weakly less.</div>
      <div class="abs o7nc" style="left:${BX}px;top:748px;width:${BW}px;text-align:center">
        <div class="body" style="font-size:48px"><span class="hl">${M(BILL)}<svg><line x1="0" y1="6" x2="100%" y2="6" class="draw" data-in="3"/></svg></span></div>
        <div class="c-ink2" style="margin-top:40px;font-size:36px;line-height:1.3">made the original problem nonconvex</div></div>`,
    init(el, L) {
      const svg = L.flags(L.svg(el), { out: 3 });
      P = L.plot({ x0: TL, y0: 930, w: 680, h: 298 });       // y-axis under the box's text edge; labels ~38 px below the two-statement box
      L.axes(el, P, { origin: false, ext: 0, flags: { out: 3 } });
      L.label(el, P.x0 + 20, P.y0 - P.h - 10, '\\(a_t\\)', { anchor: 'lb', out: 3, style: 'font-size:40px' });
      L.label(el, P.x0 + 92, P.y0 - P.h - 14, 'capability', { anchor: 'lb', color: 'ink2', out: 3 });
      const lab = (x, y, t, o) => L.label(el, x, y, t, Object.assign({ anchor: 'ct', color: 'ink2', out: 3 }, o));
      lab(P.X(TX[0]), P.y0 + 14, 'hardest task'); lab(P.X(TX[4]), P.y0 + 14, 'easiest task');
      lab(P.X(TX[0]), P.y0 + 54, 'lowest value', { in: 2 }); lab(P.X(TX[4]), P.y0 + 54, 'highest value', { in: 2 });
      const g = L.g(svg);
      fbP = TX.map((x, i) => P.pt(x, FB[i]));
      L.poly(g, fbP, { color: 'green', w: 3.5, dash: '11 9' });
      fbP.forEach(q => L.ring(g, q[0], q[1], { color: 'green', r: 12, w: 3, fill: 'paper' }));   // filled: a clean open circle
      sdLine = L.path(g, '', { color: 'orange', w: 4 });
      sdDots = [0, 1, 2, 3].map(() => mark(L, g, TRI, 'orange', 0, 0));
      sbLine = L.path(g, '', { color: 'ink', w: 4 });
      sbDots = TX.map(() => mark(L, g, SQ, 'ink', 0, 0));
      // legend, top left of the chart, with the same marker shapes
      const lg = L.g(svg), LX = P.x0 + 32, LY = [0, 1, 2].map(j => P.y0 - P.h + 24 + 39 * j);
      L.line(lg, LX, LY[0], LX + 52, LY[0], { color: 'green', w: 3.5, dash: '11 9', cap: 'butt' }); L.ring(lg, LX + 26, LY[0], { color: 'green', r: 12, w: 3, fill: 'paper' });
      L.line(lg, LX, LY[1], LX + 52, LY[1], { color: 'ink', w: 4 }); mark(L, lg, SQ, 'ink', LX + 26, LY[1]);
      const l3 = L.flags(L.g(lg), { in: 2 });
      L.line(l3, LX, LY[2], LX + 52, LY[2], { color: 'orange', w: 4 }); mark(L, l3, TRI, 'orange', LX + 26, LY[2]);
      L.label(el, LX + 68, LY[0], 'first best', { anchor: 'l', color: 'green', out: 3 });
      L.label(el, LX + 68, LY[1], 'optimal mechanism', { anchor: 'l', out: 3 });
      L.label(el, LX + 68, LY[2], 'standard (UBP)', { anchor: 'l', color: 'orange', in: 2, out: 3 });
      el._box = el.querySelector('.o7box'); el._t2 = el.querySelector('.o7r2'); el._t3 = el.querySelector('.o7r3');
      el._tc = el.querySelector('.o7con'); el._nc = el.querySelector('.o7nc');
    },
    // bottom: box bottom; r2, r3: statements 2 and 3; sb: interior types leave first best; sd: standard screening; con: contrast text
    state: k => [
      { bottom: BOT[0], r2: 0, sb: 0, sd: 0, con: 0, r3: 0 },
      { bottom: BOT[1], r2: 1, sb: 1, sd: 0, con: 0, r3: 0 },
      { bottom: BOT[1], r2: 1, sb: 1, sd: 1, con: 1, r3: 0 },
      { bottom: BOT[2], r2: 1, sb: 1, sd: 1, con: 0, r3: 1 }][k],
    dur: k => (k === 3 ? 850 : 1150),
    draw(el, s, L) {
      el._box.style.height = (s.bottom - BY) + 'px';
      L.op(el._t2, L.sub(s.r2, 0.62, 1));                             // starts once the growing box holds the line
      const o3 = L.sub(s.r3, 0.72, 1); L.op(el._t3, o3); L.op(el._nc, o3);   // ... and holds the grey sub-line
      L.op(el._tc, s.r3 > 0 ? L.sub(s.con, 0.6, 1) : s.con);            // leaves quickly when the box grows
      // optimal contract: interior dots start on first best and move up or down
      const mb = L.sub(s.sb, 0.1, 1);
      const sbP = TX.map((x, i) => [fbP[i][0], L.mix(fbP[i][1], P.Y(SB[i]), mb)]);
      sbDots.forEach((d, i) => { L.at(d, sbP[i][0], sbP[i][1]); if (i > 0 && i < 4) L.op(d, L.sub(s.sb, 0, 0.15)); });
      sbLine.setAttribute('d', pathOf(sbP)); L.op(sbLine, L.sub(s.sb, 0, 0.35));
      // standard screening: every dot but the top starts on first best and drops
      const md = L.sub(s.sd, 0.1, 1);
      const sdP = TX.map((x, i) => [fbP[i][0], L.mix(fbP[i][1], P.Y(SD[i]), md)]);
      sdDots.forEach((d, i) => { L.at(d, sdP[i][0], sdP[i][1]); L.op(d, L.sub(s.sd, 0, 0.15)); });
      sdLine.setAttribute('d', pathOf(sdP)); L.op(sdLine, L.sub(s.sd, 0, 0.35));
    }
  });
})();
