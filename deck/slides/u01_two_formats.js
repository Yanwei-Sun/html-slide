// Two pricing formats.
(function () {
  const CX = [515, 1405];                         // column centres: UBP, PFS (each column fills half of the 120..1800 band)
  const S = 1.35, SW = 1.12;                      // the mini flow is drawn at S x its base size; strokes grow only SW x
  const YS = 404, YF = YS + 150 * S, YT = (YS + YF) / 2;   // success row, failure row, task row of the mini flow

  // task -> success / failure -> bill. 'ubp' bills both states; 'pfs' bills success only.
  function flow(svg, el, L, cx, fmt, k) {
    const c = fmt === 'ubp' ? 'orange' : 'teal';
    const g = L.flags(L.g(svg), { in: k });
    const xT = cx - 245 * S, xO = cx + 5 * S, xB = cx + 215 * S;
    const A = { color: 'ink3', w: 3 * SW, head: 18 };
    L.icon(g, 'doc', xT, YT, 100 * S, { color: 'ink2', w: 4.5 * SW / S });
    L.arrow(g, xT + 50 * S, YT - 20 * S, xO - 48 * S, YS + 10 * S, A);
    L.arrow(g, xT + 50 * S, YT + 20 * S, xO - 48 * S, YF - 10 * S, A);
    L.icon(g, 'check', xO, YS, 62 * S, { color: 'ink', w: 5 * SW / S });
    L.icon(g, 'cross', xO, YF, 48 * S, { color: 'ink', w: 6.9 * SW / S });   // same stroke width as the check
    L.arrow(g, xO + 42 * S, YS, xB - 54 * S, YS, A);
    L.arrow(g, xO + 42 * S, YF, xB - 54 * S, YF, A);
    L.icon(g, 'coin', xB, YS, 100 * S, { color: c, w: 4.5 * SW / S });
    if (fmt === 'ubp') L.icon(g, 'coin', xB, YF, 100 * S, { color: c, w: 4.5 * SW / S });
    else {                                         // no bill: an empty, dashed coin
      L.el(g, 'circle', { cx: xB, cy: YF, r: 34 * S, fill: 'none', stroke: L.C.ink3, 'stroke-width': 3 * SW, 'stroke-dasharray': `${6 * S} ${7 * S}` });
      L.el(g, 'text', { x: xB, y: YF + 14 * S, 'text-anchor': 'middle', 'font-size': 40 * S, fill: L.C.ink3, 'font-family': 'CM, serif' }).textContent = '0';
    }
    const o = extra => Object.assign({ in: k }, extra);
    L.label(el, xT, YT + 40 * S + 22, 'task', o({ anchor: 't', color: 'ink2' }));
    L.label(el, xB + 50 * S, YS, '\\(p\\)', o({ anchor: 'l', size: 'l', color: c }));
    L.label(el, xB + 50 * S, YF, '\\(q\\)', o({ anchor: 'l', size: 'l', color: fmt === 'ubp' ? c : 'ink3' }));
  }

  Deck.slide({
    id: 'U01', section: 'UBP vs. PFS', title: 'Two pricing formats', steps: 1,
    notes: [
  "Usage-based pricing charges the <b>same</b> price per task, <b>whatever the outcome</b>. Pay only for success sets the failure price to zero.",
  "Under pay only for success, the <b>report</b> <b>decides whether</b> she pays."
],
    html: `
      <style>
        .slide[data-id="U01"] .u01-col { position: absolute; width: 800px; text-align: center; }
        .slide[data-id="U01"] .u01-head { font-size: 44px; line-height: 1.2; }
        .slide[data-id="U01"] .u01-eq { font-size: 64px; line-height: 1.2; }
        .slide[data-id="U01"] .u01-note { font-size: 36px; line-height: 1.4; }
      </style>
      <div class="u01-col u01-head" style="left:${CX[0] - 400}px;top:188px" data-in="0"><span class="c-orange">Usage-based pricing</span> <span class="c-ink2">(UBP)</span></div>
      <div class="u01-col u01-eq" style="left:${CX[0] - 400}px;top:716px" data-in="0">\\(p=q\\)</div>
      <div class="u01-col note u01-note" style="left:${CX[0] - 400}px;top:856px" data-in="1">The outcome-alignment rule<br>does not affect payments.</div>

      <div class="u01-col u01-head" style="left:${CX[1] - 400}px;top:188px" data-in="0"><span class="c-teal">Pay only for success</span> <span class="c-ink2">(PFS)</span></div>
      <div class="u01-col u01-eq" style="left:${CX[1] - 400}px;top:716px" data-in="0">\\(q=0\\)</div>
      <div class="u01-col note u01-note" style="left:${CX[1] - 400}px;top:856px" data-in="1">Misalignment can (significantly)<br>raise seller profit.</div>

      `,
    init(el, L) {
      const svg = L.svg(el);
      flow(svg, el, L, CX[0], 'ubp', 0);
      flow(svg, el, L, CX[1], 'pfs', 0);
    }
  });
})();
