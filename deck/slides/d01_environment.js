// The model.
(function () {
  const ease = Deck.ease;
  // draw() receives the engine's eased progress; undo the easing so that one click can stage
  // several motions, each with its own ease-in-out
  const unease = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
  const seg = (t, a, b) => ease(Math.max(0, Math.min(1, (t - a) / (b - a))));
  const mix = (a, b, t) => a + (b - a) * t;

  // ---- geometry (stage px) ----
  const YN = 184, YI = 312;                  // names row, icons row
  // seller, service, buyer: evenly spaced across the stage; the seller's set starts at the 120 px margin and
  // the buyer's type lines end near 1800 (the formula below then sits centred on the stage)
  const XS = 486, XB = 1586, XA = (XS + XB) / 2;
  const BAD = [XS - 156, XS, XS + 156], BR = 54;  // logo badges: centres, radius (spaced for 36 px names)
  const IC = 146;                            // robot and buyer icons
  const BH = 180;                            

  const Y0 = 528, YO = Y0 + BH + 44, YV = YO + 72, YF = 944;
  const TY = YI + 0.4 * IC + 38, TD = 46;    

  const TX = XB - 206, BUL = 30;
  // text: names and tree labels 40 px, explanations 36 px (.lab.m), the formula (the key statement) 48 px
  const TL = 40, FS = 48, K0 = TL / FS;      // a tree label is the formula copy at scale K0
  const line3 = (a, b) => [a, [mix(a[0], b[0], 1 / 3), mix(a[1], b[1], 1 / 3)], [mix(a[0], b[0], 2 / 3), mix(a[1], b[1], 2 / 3)], b];
  // a branch of the outcome tree: leaves the service steeply, arrives vertically above its outcome at x = c
  const branch = (x0, c) => [[x0, Y0], [x0 + (x0 < XA ? -22 : 22), Y0 + 0.49 * BH], [c, Y0 + 0.47 * BH], [c, Y0 + BH]];
  const LS = BR / 46, lpx = v => Math.round(v * LS) + 'px';   // logos scale with their badges
  const LOGO = [
    ['GPT', `<img src="assets/gpt_logo.png" alt="" style="width:${lpx(54)};height:${lpx(54)}">`],
    ['Claude', '<div class="d01-claude"></div>'],
    ['Gemini', `<img src="assets/gemini_logo.png" alt="" style="width:${lpx(58)};height:${lpx(58)}">`]];

  // ---- arrows that grow with their head (3b1b GrowArrow), along a cubic Bezier ----
  function cubic(P, u) {                     // de Casteljau: point, tangent, controls of the piece [0, u]
    const l = (a, b) => [mix(a[0], b[0], u), mix(a[1], b[1], u)];
    const a = l(P[0], P[1]), b = l(P[1], P[2]), c = l(P[2], P[3]), d = l(a, b), e = l(b, c), f = l(d, e);
    return { pt: f, tan: [e[0] - d[0], e[1] - d[1]], c1: a, c2: d };
  }
  function setPath(A, P) {
    let len = 0, q0 = P[0];
    for (let i = 1; i <= 48; i++) { const q = cubic(P, i / 48).pt; len += Math.hypot(q[0] - q0[0], q[1] - q0[1]); q0 = q; }
    A.P = P; A.len = len;
  }
  function mkArrow(svg, L, P) {
    const g = L.g(svg, { opacity: 0 });
    const A = { g, shaft: L.path(g, 'M0,0', { color: 'ink2', w: 3.5 }), head: L.el(g, 'path', { fill: L.C.ink2 }) };
    setPath(A, P);
    return A;
  }
  function setArrow(A, u) {
    if (u <= 0.002) { A.g.setAttribute('opacity', 0); return; }
    A.g.setAttribute('opacity', 1);
    const s = Math.min(19, 0.55 * u * A.len);                 // the head grows in over the first pixels
    const k = cubic(A.P, u), n = Math.hypot(k.tan[0], k.tan[1]) || 1, ux = k.tan[0] / n, uy = k.tan[1] / n;
    const kb = cubic(A.P, Math.max(0, u - (0.6 * s) / A.len)); // the shaft stops inside the head
    const f = v => v.toFixed(1);
    A.shaft.setAttribute('d', `M${f(A.P[0][0])},${f(A.P[0][1])}C${f(kb.c1[0])},${f(kb.c1[1])} ${f(kb.c2[0])},${f(kb.c2[1])} ${f(kb.pt[0])},${f(kb.pt[1])}`);
    const [tx, ty] = k.pt, bx = tx - ux * s, by = ty - uy * s, px = -uy * s * 0.5, py = ux * s * 0.5;
    A.head.setAttribute('d', `M${f(tx)},${f(ty)}L${f(bx + px)},${f(by + py)}L${f(bx - px)},${f(by - py)}Z`);
  }

  // ---- helpers ----
  const op = (nodes, v) => nodes.forEach(n => { n.style.opacity = v; });
  function box(n, S, sc) {                   // box of the typeset content of a node, in stage px
    const ms = n.querySelectorAll('mjx-container'), list = ms.length ? [...ms] : [n];
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    list.forEach(m => { const q = m.getBoundingClientRect(); l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
    return { x: ((l + r) / 2 - S.left) / sc, y: ((t + b) / 2 - S.top) / sc, w: (r - l) / sc };
  }

  let arrows = {}, parts = {}, pieces = [], outc = [], blab = [], vlab = [], fdiv = null, brace = null;

  // place the tree so that the success branch ends at x = c1 and the failure branch at x = c2
  function layout(c1, c2) {
    setPath(arrows.suc, branch(XA - 20, c1));
    setPath(arrows.fai, branch(XA + 20, c2));
    // probability labels just outside each branch, at 74% of its length (clear of the buyer's type lines),
    // offset along the outward normal
    [[arrows.suc, blab[0], -1], [arrows.fai, blab[1], 1]].forEach(([A, lab, side]) => {
      const k = cubic(A.P, 0.74), n = Math.hypot(k.tan[0], k.tan[1]), nx = side * k.tan[1] / n, ny = -side * k.tan[0] / n;
      lab.style.left = (k.pt[0] + 18 * nx) + 'px'; lab.style.top = (k.pt[1] + 18 * ny) + 'px';
    });
    outc[0].x = c1; outc[1].x = c2;
    vlab[0].style.left = c1 + 'px'; vlab[1].style.left = c2 + 'px';
  }

  // an outcome (icon + words, of measured width w) centred on its branch
  function placeOutcome(o, w) {
    const gap = 16, x0 = o.x - (o.size + gap + w) / 2;
    o.icon.setAttribute('transform', `translate(${x0},${YO - 8 - o.size / 2}) scale(${o.size / 100})`);
    o.lab.style.left = (x0 + o.size + gap) + 'px';
  }

  // an outcome value copied down into the formula (starts exactly on its tree label, at 40/48 scale)
  function fly(p, u) {
    if (!p.d1) { p.cp.style.opacity = 0; p.ph.style.visibility = u > 0 ? 'visible' : 'hidden'; p.ph.style.opacity = u; return; }
    p.cp.style.opacity = u > 0 ? 1 : 0;
    const k = mix(K0, 1, u), dx = mix(p.d0[0], p.d1[0], u), dy = mix(p.d0[1], p.d1[1], u);
    p.cp.style.transform = `translate(-50%,-50%) translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${k.toFixed(4)})`;
  }

  const GAM = '<span class="c-gold">\\(\\gamma_t(a)\\)</span>';
  const OMG = '\\(1-{}\\)' + GAM;                          

  const VS = '\\(\\widetilde v_t(\\mathrm{success})\\)', VF = '\\(\\widetilde v_t(\\mathrm{failure})\\)';

  Deck.slide({
    id: 'D01', section: 'Model', name: 'The model', title: '', steps: 3,    
    notes: [
  "Start with the seller: one AI company with a range of AI capabilities, like <b>different</b> models, or one model with more or less <b>reasoning effort</b>.",
  "Running the AI costs the seller money on <b>every attempt</b>, success or failure. On the other side is the AI buyer, who pays for the <b>agent's work</b> on her tasks.",
  "She knows <b>two things</b> the seller doesn't, and together we call them her type. One is what each outcome is worth to her: one value if the task succeeds, another if it fails. The other is <b>how hard</b> her task is for the AI, which sets her success probability.",
  "So what matters to her is her <b>expected</b> value: the two outcome values, <b>weighted</b> by how often each happens."
],
    html: `
      <style>
        .slide[data-id="D01"] .d01-badge { width:${2 * BR}px; height:${2 * BR}px; margin:-${BR}px 0 0 -${BR}px; border-radius:50%;
          border:2px solid var(--rule); background:var(--paper); display:flex; align-items:center; justify-content:center; }
        .slide[data-id="D01"] .d01-claude { width:${lpx(60)}; height:${lpx(60)}; background:url(assets/claude_logo.png) no-repeat;
          background-size:${(800 * 60 * LS / 220).toFixed(1)}px; background-position:-${(290 * 60 * LS / 220).toFixed(1)}px -${(200 * 60 * LS / 220).toFixed(1)}px; }
        .slide[data-id="D01"] .lab.m { font-size:36px; }
        .slide[data-id="D01"] .d01-bul { display:inline-block; width:30px; color:var(--ink2); }
        .slide[data-id="D01"] .lab.d01-n { font-size:${TL}px; }
        .slide[data-id="D01"] .lab.d01-br { font-size:42px; }
        .slide[data-id="D01"] .d01-f { transform:translateY(-50%); font-size:${FS}px; line-height:1; white-space:nowrap; }
        .slide[data-id="D01"] .d01-f > span { opacity:0; }
        .slide[data-id="D01"] .d01-f > .d01-ph { visibility:hidden; opacity:1; }
        .slide[data-id="D01"] .d01-sp { margin-left:.17em; }
      </style>
      ${BAD.map((x, i) => `<div class="abs d01-badge" style="left:${x}px;top:${YI}px" data-in="0">${LOGO[i][1]}</div>`).join('')}
      <div class="abs d01-f" style="left:360px;top:${YF}px"><span class="d01-f0 c-blue">\\(v_t(a)\\)</span><span class="d01-f0">\\({}={}\\)</span><span class="d01-f1 d01-t1">${GAM}</span><span class="d01-ph d01-t1 d01-sp c-blue">${VS}</span><span class="d01-f1">\\({}+{}\\)</span><span class="d01-f1 d01-t2">\\([\\)</span><span class="d01-f1 d01-t2">${OMG}</span><span class="d01-f1 d01-t2">\\(]\\)</span><span class="d01-ph d01-t2 d01-sp c-blue">${VF}</span></div>`,
    init(el, L) {
      const svg = L.svg(el);
      // 0: the seller and its services
      L.label(el, XS, YN, 'AI seller', { anchor: 'c', cls: 'd01-n', in: 0 });
      L.label(el, BAD[0] - BR - 12, YI, '\\(\\mathcal A=\\Bigg\\{\\)', { anchor: 'r', cls: 'd01-br', in: 0 });
      

      L.label(el, BAD[2] + BR + 50, YI, '\\(\\cdots\\)', { anchor: 'c', cls: 'd01-br', in: 0 });
      brace = L.label(el, BAD[2] + BR + 90, YI, '\\(\\Bigg\\}\\)', { anchor: 'l', cls: 'd01-br', in: 0 });
      BAD.forEach((x, i) => L.label(el, x, YI + BR + 16, LOGO[i][0], { anchor: 'ct', size: 'm', color: 'ink2', in: 0 }));
      

      L.label(el, XS, YI + BR + 118, '\\(\\mathcal A\\) can be discrete or continuous', { anchor: 'c', size: 'm', color: 'ink2', in: 0 });
      // 1: the service and the buyer
      // each arrow stops 36-42 px short of the icon it points at (robot body 0.68 IC wide, person 0.6 IC)
      arrows.s2a = mkArrow(svg, L, line3([BAD[2] + BR + 70, YI], [XA - 0.34 * IC - 36, YI]));   // start re-set in after()
      arrows.a2b = mkArrow(svg, L, line3([XA + 0.34 * IC + 36, YI], [XB - 0.3 * IC - 42, YI]));
      parts.service = [L.icon(svg, 'robot', XA, YI, IC, { w: 480 / IC }),     // strokes stay 4.8 px
        L.label(el, XA, YN, 'AI capability \\(a\\)', { anchor: 'c', cls: 'd01-n' }),
        L.label(el, XA, YI + 0.34 * IC + 48, '<span class="c-ink2">seller cost</span> \\(c(a)\\)', { anchor: 'c', size: 'm' })];
      parts.buyer = [L.icon(svg, 'person-o', XB, YI, IC, { w: 480 / IC }), L.label(el, XB, YN, 'AI buyer', { anchor: 'c', cls: 'd01-n' })];
      // 2: the private type, and the two true outcomes
      parts.type = [
        L.label(el, XB, TY, 'private type \\(t\\in\\mathcal T\\) <span class="c-ink2">(finite)</span>', { anchor: 'c', size: 'm' }),
        L.label(el, TX, TY + TD, '<span class="d01-bul">\u2022</span><span class="c-ink2">outcome values</span> <span class="c-blue">\\(\\widetilde v_t(\\cdot)\\)</span>', { anchor: 'l', size: 'm' }),
        L.label(el, TX, TY + 2 * TD, '<span class="d01-bul">\u2022</span><span class="c-ink2">success probability</span> ' + GAM, { anchor: 'l', size: 'm' }),
        L.label(el, TX + BUL, TY + 3 * TD, '(task complexity)', { anchor: 'l', size: 'm', color: 'ink2' })];
      arrows.suc = mkArrow(svg, L, branch(XA - 20, XA - 270));
      arrows.fai = mkArrow(svg, L, branch(XA + 20, XA + 270));
      blab = [L.label(el, 0, 0, GAM, { anchor: 'rb', cls: 'd01-n' }), L.label(el, 0, 0, OMG, { anchor: 'lb', cls: 'd01-n' })];
      parts.branch = blab;
      outc = [{ icon: L.icon(svg, 'check', 0, 0, 51, { color: 'ink2', w: 5 }), lab: L.label(el, 0, YO, 'true success', { anchor: 'l', cls: 'd01-n' }), size: 51 },
              { icon: L.icon(svg, 'cross', 0, 0, 44, { color: 'ink2', w: 5 }), lab: L.label(el, 0, YO, 'true failure', { anchor: 'l', cls: 'd01-n' }), size: 44 }];
      parts.outcome = outc.flatMap(o => [o.icon, o.lab]);
      vlab = [L.label(el, 0, YV, VS, { anchor: 'c', color: 'blue', cls: 'd01-n' }), L.label(el, 0, YV, VF, { anchor: 'c', color: 'blue', cls: 'd01-n' })];
      parts.value = vlab;
      layout(XA - 270, XA + 270);            // provisional; after() re-lays the tree on the typeset formula
      outc.forEach(o => placeOutcome(o, 200));
      // 3: the formula
      fdiv = el.querySelector('.d01-f');
      parts.f0 = [...fdiv.querySelectorAll('.d01-f0')];
      parts.f1 = [...fdiv.querySelectorAll('.d01-f1')];
      const ph = [...fdiv.querySelectorAll('.d01-ph')];
      pieces = [VS, VF].map((h, i) => {
        const cp = L.label(el, 0, 0, h, { anchor: 'c', color: 'blue' });
        cp.style.fontSize = FS + 'px'; cp.style.opacity = 0;
        return { src: vlab[i], ph: ph[i], cp };
      });
    },
    after(el) {
      const keep = el.style.display; el.style.display = 'block';
      const S = el.parentNode.getBoundingClientRect(), sc = S.width / 1920 || 1;
      // 1. each term of the typeset formula sits centred under its branch: the distance between the two
      //    terms fixes the width of the tree, which stays centred under the service
      const term = c => { const b = [...fdiv.querySelectorAll(c)].map(n => n.getBoundingClientRect());
        return ((Math.min(...b.map(q => q.left)) + Math.max(...b.map(q => q.right))) / 2 - S.left) / sc; };
      const m1 = term('.d01-t1'), m2 = term('.d01-t2'), half = (m2 - m1) / 2;
      const c1 = XA - half, c2 = XA + half;
      fdiv.style.left = (parseFloat(fdiv.style.left) + c1 - m1) + 'px';
      layout(c1, c2);
      // 2. centre each outcome (icon + words) on its branch
      outc.forEach(o => placeOutcome(o, box(o.lab, S, sc).w));
      // 3. the first arrow starts 32 px after the closing brace
      const rb = box(brace, S, sc);
      setPath(arrows.s2a, line3([rb.x + rb.w / 2 + 32, YI], arrows.s2a.P[3]));
      // 4. each copy starts exactly on its tree label (at 40/48 scale) and lands on its slot
      pieces.forEach(p => {
        p.cp.style.left = p.src.style.left; p.cp.style.top = p.src.style.top;
        const T = box(p.src, S, sc), E = box(p.ph, S, sc), C = box(p.cp, S, sc);
        const x = parseFloat(p.cp.style.left), y = parseFloat(p.cp.style.top), ox = C.x - x, oy = C.y - y;
        p.d0 = [T.x - x - K0 * ox, T.y - y - K0 * oy];
        p.d1 = [E.x - x - ox, E.y - y - oy];
      });
      el.style.display = keep;
    },
    state: k => ({ c1: k >= 1 ? 1 : 0, c2: k >= 2 ? 1 : 0, c3: k >= 3 ? 1 : 0 }),
    dur: k => [0, 600, 1700, 1500][k],
    draw(el, s) {
      const t1 = unease(s.c1), t2 = unease(s.c2), t3 = unease(s.c3);
      // 1: seller -> service -> buyer
      setArrow(arrows.s2a, seg(t1, 0, 0.45));         
      op(parts.service, seg(t1, 0.1, 0.5));
      setArrow(arrows.a2b, seg(t1, 0.3, 0.75));
      op(parts.buyer, seg(t1, 0.4, 0.85));
      // 2: the type, then the tree
      op(parts.type, seg(t2, 0, 0.32));
      setArrow(arrows.suc, seg(t2, 0.24, 0.7));
      setArrow(arrows.fai, seg(t2, 0.24, 0.7));
      op(parts.branch, seg(t2, 0.46, 0.76));
      op(parts.outcome, seg(t2, 0.6, 0.88));
      op(parts.value, seg(t2, 0.7, 1));
      // 3: v_t(a) =, the two values drop into place, then their weights and the sum
      op(parts.f0, seg(t3, 0, 0.3));
      pieces.forEach(p => fly(p, seg(t3, 0.1, 0.62)));
      op(parts.f1, seg(t3, 0.55, 0.9));
    }
  });
})();
