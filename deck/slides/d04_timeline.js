// Timeline.
(function () {
  const AY = 746, X0 = 122;                            // the time axis
  const XS = [0, 1, 2, 3, 4, 5].map(i => 208 + i * 215.2);   // events 1-6, evenly spaced; 6 is the buyer's decision node
  const X6 = XS[5], IY = AY - 80, IS = 76;             // icon centres and size
  const FX = 140, FY = 90;                             // the fork: branch ends at (X6 + FX, AY -/+ FY)
  const T_OF = [0, 3.35, 5.35, 5.35, 5.35];            // timeline progress (event i is reached at T = i)
  const ease = Deck.ease, clamp = x => Math.max(0, Math.min(1, x)), mix = (a, b, t) => a + (b - a) * t;
  const seg = (u, a, b) => ease(clamp((u - a) / (b - a)));
  // draw() receives the engine's eased progress; undo the easing so that click 3 can stage its motions
  const unease = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
  const pos = T => { if (T <= 0) return X0; if (T >= 6) return X6; const i = Math.floor(T), f = T - i; const a = i === 0 ? X0 : XS[i - 1]; return a + (XS[i] - a) * f; };
  const STRUT = '\\(\\vphantom{\\widehat\\omega(\\mathcal M_r}\\)';   // equal line boxes for every caption line
  let axis, dots, evs, node6, branches, opts;

  // ---- icons drawn in the style of Deck.lib.icon (100 x 100 box, round joins) ----
  function box(p, L, x, y, size) { return L.g(p, { transform: `translate(${x - size / 2},${y - size / 2}) scale(${size / 100})` }); }
  function hidden(p, L, x, y, size) {          // the true outcome: a face-down card
    const g = box(p, L, x, y, size), c = L.C.ink2;
    L.el(g, 'rect', { x: 24, y: 10, width: 52, height: 80, rx: 9, fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-dasharray': '10 7' });
    const t = L.el(g, 'text', { x: 50, y: 67, 'text-anchor': 'middle', 'font-size': 46, fill: c, 'font-family': 'CM, serif' }); t.textContent = '?';
    return g;
  }
  function lens(p, L, x, y, size) {            // verification: a magnifier
    const g = box(p, L, x, y, size), c = L.C.ink, S = { fill: 'none', stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round' };
    L.el(g, 'circle', Object.assign({ cx: 42, cy: 42, r: 25 }, S));
    L.el(g, 'line', Object.assign({ x1: 61, y1: 61, x2: 84, y2: 84 }, S, { 'stroke-width': 9 }));
    return g;
  }
  function brace(x1, x2, y, h) {               // a horizontal curly brace; its tip points down (h > 0) or up (h < 0)
    const m = (x1 + x2) / 2, r = Math.min(16, (x2 - x1) / 8), c = y + h / 2;
    return `M${x1},${y} Q${x1},${c} ${x1 + r},${c} L${m - r},${c} Q${m},${c} ${m},${y + h} Q${m},${c} ${m + r},${c} L${x2 - r},${c} Q${x2},${c} ${x2},${y}`;
  }

  // ---- the fork: arrows along a cubic Bezier that grow with their head (3b1b GrowArrow), as in D01 ----
  function cubic(P, u) {                       // de Casteljau: point, tangent, controls of the piece [0, u]
    const l = (a, b) => [mix(a[0], b[0], u), mix(a[1], b[1], u)];
    const a = l(P[0], P[1]), b = l(P[1], P[2]), c = l(P[2], P[3]), d = l(a, b), e = l(b, c), f = l(d, e);
    return { pt: f, tan: [e[0] - d[0], e[1] - d[1]], c1: a, c2: d };
  }
  function mkCurve(svg, L, P) {
    const g = L.g(svg, { opacity: 0 });
    const A = { g, P, shaft: L.path(g, 'M0,0', { color: 'ink2', w: 3 }), head: L.el(g, 'path', { fill: L.C.ink2 }) };
    let len = 0, q0 = P[0];
    for (let i = 1; i <= 48; i++) { const q = cubic(P, i / 48).pt; len += Math.hypot(q[0] - q0[0], q[1] - q0[1]); q0 = q; }
    A.len = len;
    return A;
  }
  function setCurve(A, u) {
    if (u <= 0.002) { A.g.setAttribute('opacity', 0); return; }
    A.g.setAttribute('opacity', 1);
    const s = Math.min(16, 0.55 * u * A.len);                   // the head grows in over the first pixels
    const k = cubic(A.P, u), n = Math.hypot(k.tan[0], k.tan[1]) || 1, ux = k.tan[0] / n, uy = k.tan[1] / n;
    const kb = cubic(A.P, Math.max(0, u - (0.6 * s) / A.len));  // the shaft stops inside the head
    const f = v => v.toFixed(1);
    A.shaft.setAttribute('d', `M${f(A.P[0][0])},${f(A.P[0][1])}C${f(kb.c1[0])},${f(kb.c1[1])} ${f(kb.c2[0])},${f(kb.c2[1])} ${f(kb.pt[0])},${f(kb.pt[1])}`);
    const [tx, ty] = k.pt, bx = tx - ux * s, by = ty - uy * s, px = -uy * s * 0.5, py = ux * s * 0.5;
    A.head.setAttribute('d', `M${f(tx)},${f(ty)}L${f(bx + px)},${f(by + py)}L${f(bx - px)},${f(by - py)}Z`);
  }
  // a branch leaves the node along the axis (clear of the node's caption), bends, and arrives level with its option
  const branch = sgn => [[X6, AY], [X6 + 0.7 * FX, AY], [X6 + 0.36 * FX, AY + sgn * FY], [X6 + FX, AY + sgn * FY]];

  Deck.slide({
    id: 'D04', section: 'Model', title: 'Timeline', steps: 3,
    notes: [
  "What can the seller offer? By the revelation principle, it <b>loses nothing</b> with a <b>direct mechanism</b>. That's a menu with one item per buyer type, designed so that each buyer picks the item <b>meant for her</b>. Each item has an AI capability, a success price, a failure price, and an outcome-alignment rule.",
  "The seller offers the menu. The buyer, who <b>knows</b> her type, picks an item, and its AI capability is deployed <b>on her task</b>.",
  "At payment time, <b>neither side</b> observes the true outcome. <b>What they see</b> is the AI's report, made under the rule in her item.",
  "She knows the rule, so she updates her belief about <b>what really happened</b>. Then she pays based on the report, or disputes it. A dispute checks the true outcome, at a verification cost to <b>both sides</b>."
],
    html: `
      <style>
        .slide[data-id="D04"] .menu { font-size: 52px; }
        .slide[data-id="D04"] .leg { display: grid; grid-template-columns: auto auto; column-gap: 20px; row-gap: 4px; font-size: 36px; line-height: 1.25; }
        .slide[data-id="D04"] .leg > :nth-child(odd) { text-align: right; }
        .slide[data-id="D04"] .leg > :nth-child(even) { color: var(--ink2); }
        /* six captions share one row: 34 px keeps a clear gap between neighbours (36 px would nearly touch) */
        .slide[data-id="D04"] .cap { font-size: 34px; white-space: nowrap; text-align: center; }
        .slide[data-id="D04"] .cap > div { height: 42px; line-height: 42px; }
        .slide[data-id="D04"] .fk { font-size: 34px; white-space: nowrap; }
        .slide[data-id="D04"] .fk > div { height: 42px; line-height: 42px; }
        .slide[data-id="D04"] .d4-cost-box { border: 6px dotted #E8000B; border-radius: 8px; background: rgba(232,0,11,.05); pointer-events: none; }       /* placed in after() */
        .slide[data-id="D04"] .d4-bottleneck { width: 780px; font-size: 44px; line-height: 1.4; font-weight: 700; text-align: right; white-space: nowrap; }
        

        .slide[data-id="D04"] .d4-rp { font-size: 40px; line-height: 1.3; white-space: nowrap; }
      </style>
      <div class="abs d4-rp" id="d4-rp" data-dim="1" style="left:122px;top:139px"><b>Revelation principle</b> (without loss): one item per type.</div>
      <div class="abs menu" id="d4-menu" style="left:960px;top:328px;transform:translate(-50%,-50%)">\\(\\mathcal M=\\big\\{\\big(\\)<span class="d4-c">\\((a_r,\\,\\)<span class="c-orange">\\(p_r\\)</span>\\(,\\,\\)<span class="c-orange">\\(q_r\\)</span>\\()\\)</span>\\(,\\;\\)<span class="d4-a">\\((\\)<span class="c-purple">\\(\\sigma_r^1,\\,\\sigma_r^0\\)</span>\\()\\)</span>\\(\\big)\\big\\}_{r\\in\\mathcal T}\\)</div>
      <div class="abs lab c-ink2" id="d4-bc" style="transform:translate(-50%,0)">contract</div>
      <div class="abs lab c-ink2" id="d4-ba" style="transform:translate(-50%,-100%)">outcome-alignment rule</div>
      <div class="abs leg" id="d4-leg" data-dim="1" style="transform:translate(-50%,0)">
        <div>\\(a_r\\)</div><div>AI capability</div>
        <div class="c-orange">\\(p_r\\)</div><div>success price</div>
        <div class="c-orange">\\(q_r\\)</div><div>failure price</div>
      </div>
      <div class="abs d4-cost-box" style="display:none"></div>
      <div class="abs d4-bottleneck" style="display:none">“Verification is the bottleneck”</div>`,
    init(el, L) {
      const svg = L.svg(el);
      el._braces = [L.path(svg, '', { color: 'ink3', w: 3 }), L.path(svg, '', { color: 'ink3', w: 3 })];
      axis = L.line(svg, X0, AY, X0, AY, { color: 'ink2', w: 3 });
      dots = XS.map(x => L.dot(svg, x, AY, { r: 8 }));
      const cap = (x, lines) => L.label(el, x, AY + 24, `<div class="cap">${lines.map(l => `<div>${l}${STRUT}</div>`).join('')}</div>`, { anchor: 't' });
      const ic = [L.icon(svg, 'server', XS[0], IY, IS), L.icon(svg, 'person-o', XS[1], IY, IS), L.icon(svg, 'robot', XS[2], IY, IS),
                  hidden(svg, L, XS[3], IY, IS), L.icon(svg, 'doc', XS[4], IY, IS, { color: 'purple' })];
      const caps = [
        cap(XS[0], ['seller offers', 'menu \\(\\mathcal M\\)']),
        cap(XS[1], ['type-\\(t\\) buyer', 'picks item \\(r\\)']),
        cap(XS[2], ['AI deployed', 'capability \\(a_r\\)']),
        cap(XS[3], ['true outcome', '\\(\\omega\\sim{}\\)<span class="c-gold">\\(\\gamma_t(a_r)\\)</span>', '<span class="c-ink2">unobserved at payment</span>']),
        cap(XS[4], ['AI reports <span class="c-purple">\\(\\widehat\\omega\\)</span>', 'via <span class="c-purple">\\(\\sigma_r\\)</span>'])];
      evs = ic.map((g, i) => [g, caps[i], dots[i]]);
      // 6: the buyer's decision node, and her two options
      node6 = [L.icon(svg, 'person-o', X6, IY, IS), cap(X6, ['buyer', 'updates', 'belief, and chooses']), dots[5]];
      branches = [mkCurve(svg, L, branch(-1)), mkCurve(svg, L, branch(1))];
      const ox = X6 + FX + 35, lx = X6 + FX + 70;
      const fk = lines => '<div class="fk">' + lines.map(l => '<div>' + l + STRUT + '</div>').join('') + '</div>';
      opts = [
        L.icon(svg, 'coin', ox, AY - FY, 53, { color: 'orange' }),
        L.label(el, lx, AY - FY, fk(['pays based on <span class="c-purple">\\(\\widehat\\omega\\)</span>']), { anchor: 'l' }),
        lens(svg, L, ox, AY + FY, 51),
        L.label(el, lx, AY + FY, fk(['disputes: \\(\\omega\\) verified,', 'pays based on \\(\\omega\\)']), { anchor: 'l' }),
        L.label(el, lx, AY + FY + 62, fk(['costs the buyer \\(\\kappa_B\\)', 'costs the seller \\(\\kappa_S\\)']), { anchor: 'lt' })];
    },
    after(el) {                                     // braces under the contract and over the rule (after MathJax)
      const was = el.style.display; el.style.display = 'block';
      const R0 = el.getBoundingClientRect(), sc = R0.width / 1920;
      const bx = sel => {                           // union of the typeset boxes (glyph extents, not the inline box)
        const rs = [...el.querySelectorAll(sel + ' mjx-math')].map(n => n.getBoundingClientRect());
        const x0 = Math.min(...rs.map(r => r.left)), x1 = Math.max(...rs.map(r => r.right)), y0 = Math.min(...rs.map(r => r.top)), y1 = Math.max(...rs.map(r => r.bottom));
        return { x: (x0 - R0.left) / sc, y: (y0 - R0.top) / sc, w: (x1 - x0) / sc, h: (y1 - y0) / sc };
      };
      const c = bx('.d4-c'), a = bx('.d4-a');
      const k = opts[4].getBoundingClientRect(), kx = (k.left - R0.left) / sc, ky = (k.top - R0.top) / sc;
      const q = evs[3][1].getBoundingClientRect(), qb = (q.bottom - R0.top) / sc;   // the lowest caption: true outcome
      el.style.display = was;
      

      const bl = kx - 26, bt = ky - 10, bw = k.width / sc + 26 + 22, bh = k.height / sc + 10 + 16;
      Object.assign(el.querySelector('.d4-cost-box').style, { left: bl + 'px', top: bt + 'px', width: bw + 'px', height: bh + 'px' });
      const ct = Math.max(bt + bh / 2 - 44 * 1.4 / 2 + 11, qb - 3 + 41 + 1);
      Object.assign(el.querySelector('.d4-bottleneck').style, { left: (bl - 30 - 780) + 'px', top: ct + 'px' });
      const y = c.y + c.h + 9, ya = a.y - 9, h = 18;          // contract: brace below; rule: brace above
      el._braces[0].setAttribute('d', brace(c.x + 4, c.x + c.w - 4, y, h));
      el._braces[1].setAttribute('d', brace(a.x + 4, a.x + a.w - 4, ya, -h));
      const put = (id, x, yy) => { const n = el.querySelector(id); n.style.left = x + 'px'; n.style.top = yy + 'px'; };
      // "contract" 16 px under its brace: the tip clears the t of "contract" (at + 8 it touched it)
      put('#d4-bc', c.x + c.w / 2, y + h + 16); put('#d4-ba', a.x + a.w / 2, ya - h - 8);
      put('#d4-leg', c.x + c.w / 2, y + h + 64);
    },
    state: k => ({ T: T_OF[k], F: k >= 3 ? 1 : 0 }),
    dur: k => [0, 1500, 1100, 2000, 400][k],
    draw(el, s, L) {
      const T = s.T, u = unease(s.F);               // u: the linear clock of click 3
      const ax = s.F > 0 ? mix(pos(T), X6, seg(u, 0, 0.3)) : pos(T);
      L.seg(axis, X0, AY, ax, AY); L.op(axis, ax - X0 > 2 ? 1 : 0);
      evs.forEach(([g, c, d], i) => { const o = L.clamp((T - (i + 1) + 0.3) / 0.3); L.op(g, o); L.op(c, o); L.op(d, o); });
      const o6 = clamp((u - 0.2) / 0.14);            // the buyer's node appears as the axis reaches it
      node6.forEach(n => L.op(n, o6));
      const g = seg(u, 0.3, 0.72);                   // then her two branches grow out of it
      branches.forEach(A => setCurve(A, g));
      const oo = clamp((u - 0.62) / 0.24);           // and the two options fade in
      opts.forEach(n => L.op(n, oo));
    }
  });
})();
