// Will pay per success win?.
(function () {
  const XU = 660, XO = 1150;                            // as M09B: each row from paying for use (left) to paying for results (right)
  const X0 = 580, X1 = 1230;                            // each row's track
  const Y1 = 356, Y2 = 740;                             // the two rows (M09B: 356, 704; see the header)
  const IS = 58, IY = 72;                               // icon size; icon centre above its node
  const XR = 1380, YH = 196;                            // the result column; the two column heads
  const XH = (XU + XO) / 2;                              
  const RR = 27;                                        // the marker ring's radius

  function drawIcon(L, g, name, color) {               // M09B's icons
    const S = { fill: 'none', stroke: L.C[color] || L.C.ink2, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const E = (tag, a) => L.el(g, tag, Object.assign({}, S, a));
    if (name === 'search') { E('circle', { cx: 42, cy: 42, r: 25 }); E('line', { x1: 61, y1: 61, x2: 84, y2: 84, 'stroke-width': 7 }); }
    if (name === 'robot') L.icon(g, 'robot', 50, 50, 100, { color: 'ink', w: 5 });
    if (name === 'eye') { E('path', { d: 'M4,50 C24,17 76,17 96,50 C76,83 24,83 4,50 Z' }); E('circle', { cx: 50, cy: 50, r: 15 });
      L.el(g, 'circle', { cx: 50, cy: 50, r: 6, fill: S.stroke }); }
    if (name === 'tokens') L.icon(g, 'tokens', 50, 50, 118, { color: color || 'ink2', w: 5 / 1.18 });
    if (name === 'click') E('path', { d: 'M26,10 L26,78 L42,63 L53,88 L64,83 L53,58 L74,58 Z' });
    if (name === 'resolved') { L.icon(g, 'chat', 50, 57, 100, { color: color || 'ink2', w: 5 }); L.icon(g, 'check', 50, 50, 40, { color: 'teal', w: 8 }); }
  }
  const icon = (L, svg, name, x, y, size, color) => {
    const g = L.g(svg, { transform: `translate(${x - size / 2},${y - size / 2}) scale(${size / 100})` });
    drawIcon(L, g, name, color); return g;
  };

  let F = null;                                         // the figure's moving parts (built in init)

  Deck.slide({
    id: 'C00', section: 'Conclusion', title: 'Will pay per success win?', steps: 2,
    notes: [
  "So will pay per success win, <b>the way</b> pay per click did? In <b>the usual telling</b>, that's how Google won search ads.",
  "But Google <b>billed</b> per click and adjusted for quality. It <b>ranked</b> ads by the bid times the click-through rate: what an ad offers to pay per <b>showing</b>. A hybrid won.",
  "Our answer is similar. The best contract sits <b>in between</b>: a fee per use plus a success bonus, and with it, full outcome alignment is <b>optimal</b>. So, <b>just like</b> Google, the winner is <b>likely</b> a hybrid."
],
    html: `
      <style>
        .slide[data-id="C00"] .m9b-head { font-size: 40px; line-height: 1.2; white-space: nowrap; }
        .slide[data-id="C00"] .m9b-era { font-size: 44px; line-height: 1.2; white-space: nowrap; }
        .slide[data-id="C00"] .m9b-sub { font-size: 36px; line-height: 1.2; color: var(--ink2); white-space: nowrap; }
        .slide[data-id="C00"] .m9b-node { font-size: 40px; line-height: 1.2; white-space: nowrap; background: var(--paper); padding: 0 8px; }
        .slide[data-id="C00"] .m9b-res { font-size: 44px; line-height: 1.25; white-space: nowrap; }
        .slide[data-id="C00"] .c00-cap { font-size: 36px; line-height: 1.25; white-space: nowrap; text-align: center; background: var(--paper); padding: 0 8px; }
        .slide[data-id="C00"] .c00-ans { font-size: 34px; line-height: 1.3; white-space: nowrap; }
        .slide[data-id="C00"] .c00-ans .lead { color: var(--ink2); }
        .slide[data-id="C00"] .c00-ans .gap { margin-top: 26px; }
      </style>`,
    init(el, L) {
      const svg = L.svg(el);
      // ---- the two column heads (M09B) ----
      L.label(el, XU, YH, '<div class="m9b-head">pay for use</div>', { anchor: 'c', color: 'orange' });
      L.label(el, XO, YH, '<div class="m9b-head">pay for results</div>', { anchor: 'c', color: 'teal' });
      // ---- the two rows (M09B) ----
      const rows = [
        { y: Y1, era: 'Search ads', sub: '2000s', eraIcon: 'search', nodes: [
            { x: XU, name: 'per impression', icon: 'eye', color: 'orange' },
            { x: XO, name: 'per click', icon: 'click', color: 'teal' }] },
        { y: Y2, era: 'AI services', sub: 'today', eraIcon: 'robot', nodes: [
            { x: XU, name: 'per use', icon: 'tokens', color: 'orange' },    
            { x: XO, name: 'per success', icon: 'resolved', color: 'teal' }] }];
      rows.forEach(r => {
        icon(L, svg, r.eraIcon, 152, r.y - 4, 60, 'ink');
        L.label(el, 200, r.y - 4, `<div class="m9b-era">${r.era}</div><div class="m9b-sub">${r.sub}</div>`, { anchor: 'l' });
        L.line(svg, X0, r.y, X1, r.y, { color: 'rule', w: 3 });
        r.nodes.forEach(n => {
          L.circle(svg, n.x, r.y, 9, { fill: 'paper', color: 'ink3', w: 3 });
          icon(L, svg, n.icon, n.x, r.y - IY, IS, 'ink2');
          L.label(el, n.x, r.y + 40, n.name, { anchor: 'ct', color: n.color, cls: 'm9b-node' });
        });
      });
      

      const trailG = L.line(svg, XU, Y1, XO, Y1, { color: 'teal', w: 6 });
      

      const ghostG = L.ring(svg, XO, Y1, { color: 'ink3', r: RR, w: 3.5 }); ghostG.style.opacity = 0;
      const ringG = L.ring(svg, XO, Y1, { color: 'teal', r: RR, w: 4.5 });
      const halfG = L.g(svg, { transform: `translate(${XO},${Y1})` });
      L.el(halfG, 'path', { d: `M0,${RR} A${RR},${RR} 0 0 1 0,${-RR}`, fill: 'none', stroke: L.C.orange, 'stroke-width': 4.5, 'stroke-linecap': 'butt' });
      const dotG = L.dot(svg, XO, Y1, { r: 11 });
      // ---- click 1: Google's middle caption, hung below the row's node labels by a hairline ----
      const leadG = L.line(svg, XH, Y1 + RR + 10, XH, Y1 + 112, { color: 'ink3', w: 2.5 });
      const cap1 = L.label(el, XH, Y1 + 122, '<div class="c00-cap">per quality-adjusted click<br><span class="c-ink2">(bid × click-through rate)</span></div>', { anchor: 'ct' });
      // AI services: the marker (at per token on entry), its trail, and the hybrid's teal half ring (click 2)
      const trail = L.line(svg, XU, Y2, XU, Y2, { color: 'teal', w: 6 });
      const ringO = L.ring(svg, XU, Y2, { color: 'orange', r: RR, w: 4.5 });
      const half = L.g(svg, { transform: `translate(${XU},${Y2})` });
      L.el(half, 'path', { d: `M0,${-RR} A${RR},${RR} 0 0 1 0,${RR}`, fill: 'none', stroke: L.C.teal, 'stroke-width': 4.5, 'stroke-linecap': 'butt' });
      const dot = L.dot(svg, XU, Y2, { r: 11 });
      // M09B's open question: a dashed teal arrow towards per outcome, a dashed ring there, a red question mark
      const qa = L.arrow(svg, XU + 36, Y2, XO - 36, Y2, { color: 'teal', w: 5, head: 18, dash: '14 11' });
      const qr = L.ring(svg, XO, Y2, { color: 'teal', r: RR, w: 4 }); qr.setAttribute('stroke-dasharray', '9 7');
      const qm = L.label(el, (XU + XO) / 2, Y2 - 52, '?', { anchor: 'c', color: 'red', style: 'font-size:64px' });
      // ---- click 2: the hybrid's label, hung below the row's node labels by a hairline ----
      const lead = L.line(svg, XH, Y2 + RR + 10, XH, Y2 + 112, { color: 'ink3', w: 2.5 });
      const hyb = L.label(el, XH, Y2 + 122, '<span class="c-orange">pay per use</span> + a <span class="c-teal">success bonus</span>', { anchor: 'ct', cls: 'm9b-node' });
       
      const hyb2 = L.label(el, XH, Y2 + 122 + 56, '<span class="c-ink2">(full outcome alignment is without loss)</span>', { anchor: 'ct', cls: 'c00-cap' });
      // ---- the right column: M09B's results, then the answers ----
      const old1 = L.label(el, XR, Y1 - 4, '<div class="m9b-res">Google won<br>search ads</div><div class="m9b-sub" style="margin-top:6px">$295B in ads (2025)</div>', { anchor: 'l' });
      const new1 = L.label(el, XR, Y1 - 4, '<div class="m9b-res">Google:<br><b>a hybrid</b> won.</div>', { anchor: 'l' });
      const old2 = L.label(el, XR, Y2 - 4, '<div class="m9b-res">Will pay per success<br>also win here?</div>', { anchor: 'l' });
      const new2 = L.label(el, XR, Y2 - 4, '<div class="m9b-res">Our answer:<br><b>a hybrid</b> too.</div>', { anchor: 'l' });
      F = { trail, ringO, half, dot, qa, qr, qm, lead, hyb, hyb2, old1, new1, cap1, old2, new2, trailG, ringG, halfG, dotG, leadG, ghostG };
    },
    // g: Google's quality adjustment (click 1); h: the AI row's answer (click 2)
    state: k => [{ g: 0, h: 0 }, { g: 1, h: 0 }, { g: 1, h: 1 }][k],
    dur: k => [0, 1100, 1900][k],
    draw(el, s, L) {
      if (!F) return;
      const op = (n, v) => { n.style.opacity = v; };
      // click 1: Google's marker slides from per click to the middle (trail shortening behind it), its ring turns half
      // orange, then the caption under the middle; the row's right column crossfades
      const g = s.g, mg = Deck.ease(L.sub(g, 0.05, 0.6)), xg = L.mix(XO, XH, mg);
      L.at(F.ringG, xg, Y1); L.at(F.dotG, xg, Y1); L.at(F.halfG, xg, Y1); L.seg(F.trailG, XU, Y1, xg, Y1);
      op(F.halfG, L.sub(g, 0.2, 0.6)); op(F.ghostG, 0.6 * L.sub(g, 0.15, 0.55));
      op(F.leadG, L.sub(g, 0.5, 0.9)); op(F.cap1, L.sub(g, 0.5, 0.9));
      op(F.old1, 1 - L.sub(g, 0, 0.4)); op(F.new1, L.sub(g, 0.45, 1));
      // click 2: the question mark goes, the marker slides to the hybrid with a solid trail behind it, the rest of the
      // dashed arrow and its ring dissolve, the ring turns half teal, then the label and the answers
      const h = s.h, mv = Deck.ease(L.sub(h, 0.1, 0.75)), x = L.mix(XU, XH, mv);
      L.at(F.ringO, x, Y2); L.at(F.dot, x, Y2); L.at(F.half, x, Y2);
      L.seg(F.trail, XU, Y2, x, Y2); op(F.trail, mv > 0.005 ? 1 : 0);
      op(F.half, L.sub(h, 0.35, 0.8));
      op(F.qm, 1 - L.sub(h, 0, 0.25));
      L.setArrow(F.qa, Math.min(x + 36, XO - 37), Y2, XO - 36, Y2); op(F.qa, 1 - L.sub(h, 0.15, 0.6));
      op(F.qr, 1 - L.sub(h, 0.15, 0.6));
      op(F.lead, L.sub(h, 0.6, 1)); op(F.hyb, L.sub(h, 0.6, 1)); op(F.hyb2, L.sub(h, 0.6, 1));
      op(F.old2, 1 - L.sub(h, 0, 0.35)); op(F.new2, L.sub(h, 0.55, 1));
    }
  });
})();
