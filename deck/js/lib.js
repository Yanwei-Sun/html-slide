// Figure helpers: SVG geometry and HTML labels in 1920 × 1080 stage coordinates.
(function () {
  const L = Deck.lib, NS = 'http://www.w3.org/2000/svg';
  const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  L.C = {};
  ['paper', 'ink', 'ink2', 'ink3', 'rule', 'wash', 'blue', 'gold', 'teal', 'orange', 'green', 'red', 'purple']
    .forEach(k => { L.C[k] = cssv('--' + k); });
  const col = c => (c && L.C[c]) || c || L.C.ink;
  L.col = col;

  L.attrs = function (n, a) { for (const k in a) if (a[k] !== undefined && a[k] !== null) n.setAttribute(k, a[k]); return n; };
  L.el = function (parent, tag, a) { const n = document.createElementNS(NS, tag); L.attrs(n, a || {}); if (parent) parent.appendChild(n); return n; };
  L.svg = function (el) {
    let s = el.querySelector(':scope > svg.fig');
    if (!s) { s = L.el(null, 'svg', { class: 'fig', viewBox: '0 0 1920 1080' }); el.insertBefore(s, el.firstChild); }
    return s;
  };
  L.g = (p, a) => L.el(p, 'g', a);
  // build flags on SVG nodes and labels: o.in / o.out / o.dim / o.undim -> data-* attributes
  function flags(n, o) {
    if (!o) return n;
    ['in', 'out', 'dim', 'undim'].forEach(k => { if (o[k] !== undefined) n.setAttribute('data-' + k, o[k]); });
    if (o.draw) n.classList.add('draw');
    if (o.cls) o.cls.split(' ').forEach(c => n.classList.add(c));
    if (o.id) n.id = o.id;
    return n;
  }
  L.flags = flags;

  // ---------- shapes ----------
  L.line = function (p, x1, y1, x2, y2, o = {}) {
    return flags(L.el(p, 'line', { x1, y1, x2, y2, stroke: col(o.color || 'ink'), 'stroke-width': o.w || 4,
      'stroke-linecap': o.cap || 'round', 'stroke-dasharray': o.dash, opacity: o.op }), o);
  };
  L.path = function (p, d, o = {}) {
    return flags(L.el(p, 'path', { d, fill: o.fill ? col(o.fill) : 'none', 'fill-opacity': o.fop, stroke: o.color === 'none' ? 'none' : col(o.color || 'ink'),
      'stroke-width': o.w === undefined ? 4 : o.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': o.dash, opacity: o.op }), o);
  };
  L.poly = function (p, pts, o = {}) { return L.path(p, 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L') + (o.close ? 'Z' : ''), o); };
  L.circle = function (p, cx, cy, r, o = {}) {
    return flags(L.el(p, 'circle', { cx, cy, r, fill: o.fill ? col(o.fill) : 'none', stroke: o.color ? col(o.color) : 'none',
      'stroke-width': o.w || 3.5, opacity: o.op }), o);
  };
  L.dot = (p, x, y, o = {}) => L.circle(p, x, y, o.r || 11, Object.assign({ fill: o.fill || 'ink' }, o));
  L.ring = (p, x, y, o = {}) => L.circle(p, x, y, o.r || 22, Object.assign({ color: o.color || 'ink', w: o.w || 3.5 }, o));
  L.at = function (n, x, y) { if (n.tagName === 'circle') L.attrs(n, { cx: x, cy: y }); else n.setAttribute('transform', `translate(${x},${y})`); return n; };
  L.seg = (n, x1, y1, x2, y2) => L.attrs(n, { x1, y1, x2, y2 });
  L.rect = function (p, x, y, w, h, o = {}) {
    return flags(L.el(p, 'rect', { x, y, width: w, height: h, rx: o.r === undefined ? 8 : o.r, fill: o.fill ? col(o.fill) : 'none', 'fill-opacity': o.fop,
      stroke: o.color ? col(o.color) : 'none', 'stroke-width': o.w || 3, opacity: o.op }), o);
  };

  // arrow from (x1,y1) to (x2,y2); returns a group whose geometry L.setArrow can update
  L.arrow = function (p, x1, y1, x2, y2, o = {}) {
    const g = flags(L.g(p, { opacity: o.op }), o);
    g._line = L.line(g, x1, y1, x2, y2, { color: o.color || 'ink', w: o.w || 4, dash: o.dash });
    g._head = L.el(g, 'path', { fill: col(o.color || 'ink') });
    g._size = o.head || 18;
    L.setArrow(g, x1, y1, x2, y2);
    return g;
  };
  L.setArrow = function (g, x1, y1, x2, y2) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.5) { L.seg(g._line, x1, y1, x1, y1); g._head.setAttribute('d', ''); return g; }   // nothing to draw yet
    // the head never outgrows the arrow, so an arrow growing from zero length has no backward stub
    const a = Math.atan2(y2 - y1, x2 - x1), s = Math.min(g._size, len), bx = x2 - s * Math.cos(a), by = y2 - s * Math.sin(a);
    L.seg(g._line, x1, y1, bx + 0.4 * s * Math.cos(a), by + 0.4 * s * Math.sin(a));
    const px = -Math.sin(a) * s * 0.5, py = Math.cos(a) * s * 0.5;
    g._head.setAttribute('d', `M${x2},${y2}L${bx + px},${by + py}L${bx - px},${by - py}Z`);
    return g;
  };

  // ---------- plots ----------
  L.plot = function (o) {
    const P = Object.assign({ xmax: 1, ymax: 1 }, o);
    P.X = v => P.x0 + (v / P.xmax) * P.w;
    P.Y = v => P.y0 - (v / P.ymax) * P.h;
    P.pt = (x, y) => [P.X(x), P.Y(y)];
    return P;
  };
  // axes with arrowheads; labels: o.x / o.y (math, colored via o.xColor / o.yColor), o.xNote / o.yNote (grey words)
  L.axes = function (el, P, o = {}) {
    const svg = L.svg(el), g = flags(L.g(svg), o.flags);
    const ext = o.ext === undefined ? 40 : o.ext;
    L.arrow(g, P.x0, P.y0, P.x0 + P.w + ext, P.y0, { color: 'ink2', w: 3, head: 20 });
    L.arrow(g, P.x0, P.y0, P.x0, P.y0 - P.h - ext, { color: 'ink2', w: 3, head: 20 });
    const lab = [];
    if (o.origin !== false) lab.push(L.label(el, P.x0 - 14, P.y0 + 12, '0', { anchor: 'rt', size: 's', color: 'ink2' }));
    if (o.x) lab.push(L.label(el, P.x0 + P.w + ext + 18, P.y0, o.x, { anchor: 'l', color: o.xColor || 'ink' }));
    if (o.xNote) lab.push(L.label(el, P.x0 + P.w / 2, P.y0 + 30, o.xNote, { anchor: 'ct', size: 's', color: 'ink2' }));
    if (o.y) lab.push(L.label(el, P.x0 + 20, P.y0 - P.h - ext - 6, o.y, { anchor: 'lb', color: o.yColor || 'ink' }));
    if (o.yNote) lab.push(L.label(el, P.x0 + 20 + (o.yNoteDx || 110), P.y0 - P.h - ext - 10, o.yNote, { anchor: 'lb', size: 's', color: 'ink2' }));
    (o.xticks || []).forEach(t => { L.line(g, P.X(t[0]), P.y0 - 8, P.X(t[0]), P.y0 + 8, { color: 'ink2', w: 3 });
      lab.push(L.label(el, P.X(t[0]), P.y0 + 24, t[1], { anchor: 'ct', size: 's', color: 'ink2' })); });   // clear of the tick mark
    if (o.flags) lab.forEach(n => flags(n, o.flags));
    return { g, labels: lab };
  };
  L.curve = function (p, P, f, a, b, o = {}) {
    const n = o.n || 80, pts = [];
    for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts.push(P.pt(x, f(x))); }
    return L.poly(p, pts, o);
  };

  // ---------- HTML labels ----------
  const ANCH = { l: [0, -50], r: [-100, -50], c: [-50, -50], t: [-50, 0], b: [-50, -100], lt: [0, 0], lb: [0, -100], rt: [-100, 0], rb: [-100, -100], ct: [-50, 0], cb: [-50, -100] };
  L.label = function (el, x, y, html, o = {}) {
    const d = document.createElement('div');
    d.className = 'lab' + (o.size ? ' ' + o.size : '');
    d.innerHTML = html;
    if (o.color) d.style.color = col(o.color);
    if (o.width) { d.style.whiteSpace = 'normal'; d.style.width = o.width + 'px'; }
    if (o.align) d.style.textAlign = o.align;
    if (o.style) d.setAttribute('style', d.getAttribute('style') + ';' + o.style);
    d._anchor = ANCH[o.anchor || 'lb'];
    L.place(d, x, y);
    flags(d, o);
    el.appendChild(d);
    return d;
  };
  L.place = function (d, x, y) { const a = d._anchor || ANCH.lb; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.transform = `translate(${a[0]}%,${a[1]}%)`; return d; };

  // ---------- icons (drawn in a 100x100 box centred on (x, y)) ----------
  L.icon = function (p, name, x, y, size = 90, o = {}) {
    const c = col(o.color || 'ink'), w = o.w || 5;
    const g = flags(L.g(p, { transform: `translate(${x - size / 2},${y - size / 2}) scale(${size / 100})` }), o);
    const S = { fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const E = (tag, a) => L.el(g, tag, Object.assign({}, S, a));
    const F = (tag, a) => L.el(g, tag, Object.assign({ fill: c, stroke: 'none' }, a));
    switch (name) {
      case 'robot': E('rect', { x: 16, y: 30, width: 68, height: 54, rx: 14 }); F('circle', { cx: 38, cy: 54, r: 6 }); F('circle', { cx: 62, cy: 54, r: 6 });
        E('line', { x1: 40, y1: 71, x2: 60, y2: 71 }); E('line', { x1: 50, y1: 30, x2: 50, y2: 16 }); F('circle', { cx: 50, cy: 12, r: 5 }); break;
      case 'person': F('circle', { cx: 50, cy: 30, r: 17 }); F('path', { d: 'M18,92 C18,62 32,54 50,54 C68,54 82,62 82,92 Z' }); break;
      case 'person-o': E('circle', { cx: 50, cy: 30, r: 16 }); E('path', { d: 'M20,90 C20,63 33,55 50,55 C67,55 80,63 80,90' }); break;
      case 'firm': E('rect', { x: 18, y: 34, width: 64, height: 54, rx: 4 }); E('path', { d: 'M18,34 L50,14 L82,34' });
        [30, 46, 62].forEach(xx => E('line', { x1: xx + 4, y1: 50, x2: xx + 4, y2: 72 })); break;
      case 'server': [13, 40, 67].forEach(yy => { E('rect', { x: 19, y: yy, width: 62, height: 21, rx: 5 });   // the AI seller
        E('line', { x1: 30, y1: yy + 10.5, x2: 50, y2: yy + 10.5 }); F('circle', { cx: 69, cy: yy + 10.5, r: 3.8 }); }); break;
      case 'doc': E('path', { d: 'M24,10 H62 L78,26 V90 H24 Z' }); E('path', { d: 'M62,10 V26 H78' });
        [42, 56, 70].forEach(yy => E('line', { x1: 36, y1: yy, x2: 66, y2: yy })); break;
      case 'chat': E('path', { d: 'M14,20 H86 V66 H44 L26,84 V66 H14 Z' }); break;
      case 'check': E('path', { d: 'M18,54 L40,76 L84,26', 'stroke-width': w * 1.6 }); break;
      case 'cross': E('path', { d: 'M24,24 L76,76 M76,24 L24,76', 'stroke-width': w * 1.5 }); break;
      case 'coin': E('circle', { cx: 50, cy: 50, r: 34 }); L.el(g, 'text', { x: 50, y: 64, 'text-anchor': 'middle', 'font-size': 42, fill: c, 'font-family': 'CM, serif' }).textContent = '$'; break;
      case 'clock': E('circle', { cx: 50, cy: 50, r: 36 }); E('path', { d: 'M50,28 V50 L64,60' }); break;
      case 'tokens': [0, 1, 2].forEach(i => E('rect', { x: 12 + i * 27, y: 36, width: 22, height: 28, rx: 5 })); break;
      case 'queue': [0, 1, 2, 3].forEach(i => E('rect', { x: 6 + i * 23, y: 34, width: 19, height: 32, rx: 4 })); break;
      default: E('rect', { x: 10, y: 10, width: 80, height: 80, rx: 10 });
    }
    return g;
  };

  // ---------- animation helpers ----------
  L.tween = (ms, fn, tok) => Deck.tween(ms, fn, tok);
  L.wait = (ms, tok) => Deck.wait(ms, tok);
  L.mix = (a, b, t) => a + (b - a) * t;
  L.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  // piecewise progress: sub(t, a, b) maps t in [a,b] to [0,1] (for staging inside one tween)
  L.sub = (t, a, b) => L.clamp((t - a) / (b - a));
  L.op = (n, v) => { n.style.opacity = v; return n; };
})();

/* Section cards: Deck.sectionCard({ id, index, title, sub }) — index into SECTIONS highlights the outline. */
(function () {
  const L = Deck.lib;
  L.SECTIONS = ['Motivation', 'Model', 'UBP vs. PFS', 'Optimal mechanism', 'Conclusion'];
  Deck.sectionCard = function (o) {
    const out = L.SECTIONS.map((s, i) => `<span class="${i === o.index ? 'on' : ''}">${s}</span>`).join('');
    Deck.slide({ id: o.id, name: o.title, kind: 'section-card', steps: 0, backup: o.backup, title: null, section: L.SECTIONS[o.index], notes: o.notes,
      html: `<div class="sc-title" data-in="0">${o.title}</div><div class="sc-line" data-in="0"></div>` +
            (o.sub ? `<div class="sc-sub" data-in="0" style="top:540px">${o.sub}</div>` : '') +
            (o.outline === false ? '' : `<div class="outline">${out}</div>`) });
  };
})();



(function () {
  const L = Deck.lib;
  // the busts, 640 px square: a person's is masked to the inscribed circle (its head at one size and height), the robot's
  // fills its square; mir: mirrored, so that it faces the people coming to it
  const AV = {
    customer: { f: 'customer.png' }, ai: { f: 'ai_agent.png', mir: true },
    waiting: { f: 'waiting.png' }, waiting2: { f: 'waiting2.png' }, waiting3: { f: 'waiting3.png' }, waiting4: { f: 'waiting4.png' },
    staff: { f: 'staff.png', mir: true }, staff2: { f: 'staff2.png', mir: true },
  };
  const NPX = 640, DISC = '#EEF3F1', RING = '#BEC3C1';   // the people's very pale sage disc and thin grey ring
  // the line, front first: four different people (a longer line cycles); the staff, first to last
  const LINE = ['waiting', 'waiting2', 'waiting4', 'waiting3'];
  const DESK = ['staff', 'staff2'];
  const sm = u => u * u * (3 - 2 * u);
  const tint = (c, a) => { const n = parseInt(c.slice(1), 16), f = v => Math.round(255 + (v - 255) * a);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };          // colour c at strength a, on white paper
  const f1 = v => v.toFixed(1);

  function bust(p, key) { return L.el(p, 'image', { href: 'assets/cs/bust/' + AV[key].f, width: NPX, height: NPX }); }
  function put(n, key, x, y, d) {                        // the bust centred on (x, y), d px across
    const k = d / NPX;
    n.setAttribute('transform', `translate(${f1(x)},${f1(y)}) scale(${(AV[key].mir ? -k : k).toFixed(5)},${k.toFixed(5)}) translate(${-NPX / 2},${-NPX / 2})`);
  }
  // a person: a paper halo (it parts overlapping circles), the pale disc, the bust and the thin ring over its edge
  function person(p, key, C) {
    const g = L.g(p);
    return { g, key, halo: L.el(g, 'circle', { fill: C.paper }), disc: L.el(g, 'circle', { fill: DISC }), img: bust(g, key),
             ring: L.el(g, 'circle', { fill: 'none', stroke: RING }) };
  }
  function seat(A, x, y, d) {                            // the person centred on (x, y), d px across
    const r = d / 2, w = L.clamp(0.012 * d, 1.75, 2.5), hw = L.clamp(0.025 * d, 3, 5);
    L.attrs(A.halo, { cx: f1(x), cy: f1(y), r: f1(r + hw) });
    L.attrs(A.disc, { cx: f1(x), cy: f1(y), r: f1(r) });
    put(A.img, A.key, x, y, d);
    L.attrs(A.ring, { cx: f1(x), cy: f1(y), r: f1(r - w / 2), 'stroke-width': w.toFixed(2) });
  }

  // a route through points with rounded corners: its SVG path, its length, and the point at distance s (for the tokens)
  function route(P, r) {
    const S = [P[0]];
    let d = `M${f1(P[0][0])},${f1(P[0][1])}`;
    const line = b => { const a = S[S.length - 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
      for (let i = 1; i <= n; i++) S.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
      d += `L${f1(b[0])},${f1(b[1])}`; };
    const quad = (c, b) => { const a = S[S.length - 1];
      for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; S.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
      d += `Q${f1(c[0])},${f1(c[1])} ${f1(b[0])},${f1(b[1])}`; };
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = c ? Math.hypot(c[0] - b[0], c[1] - b[1]) : 0;
      if (!c || d1 < 0.5 || d2 < 0.5) { line(b); continue; }
      const rr = Math.min(r, d1 / 2, d2 / 2);
      line([b[0] - (b[0] - a[0]) / d1 * rr, b[1] - (b[1] - a[1]) / d1 * rr]);
      quad(b, [b[0] + (c[0] - b[0]) / d2 * rr, b[1] + (c[1] - b[1]) / d2 * rr]);
    }
    const cum = [0];
    for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
    const len = cum[cum.length - 1];
    const at = s => {
      s = Math.max(0, Math.min(len, s)); let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      const t = cum[hi] > cum[lo] ? (s - cum[lo]) / (cum[hi] - cum[lo]) : 0;
      return [S[lo][0] + (S[hi][0] - S[lo][0]) * t, S[lo][1] + (S[hi][1] - S[lo][1]) * t];
    };
    return { d, len, at };
  }
  // a thin arrow along a route, with a small swept head (the shaft stops inside it)
  function arrow(p, color, w, h) {
    const g = L.g(p);
    return { g, h, shaft: L.el(g, 'path', { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
             head: L.el(g, 'path', { fill: color, stroke: color, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }) };
  }
  function setArrow(A, P, r) {
    const n = P.length, tip = P[n - 1], pre = P[n - 2], len = Math.hypot(tip[0] - pre[0], tip[1] - pre[1]);
    if (len < 1) { A.shaft.setAttribute('d', ''); A.head.setAttribute('d', ''); return; }
    const ux = (tip[0] - pre[0]) / len, uy = (tip[1] - pre[1]) / len, h = Math.min(A.h, len), hw = 0.4 * h;
    A.shaft.setAttribute('d', route(P.slice(0, n - 1).concat([[tip[0] - ux * h * 0.62, tip[1] - uy * h * 0.62]]), r).d);
    const bx = tip[0] - ux * h, by = tip[1] - uy * h, nx = tip[0] - ux * h * 0.72, ny = tip[1] - uy * h * 0.72;
    A.head.setAttribute('d', `M${f1(tip[0])},${f1(tip[1])}L${f1(bx - uy * hw)},${f1(by + ux * hw)}L${f1(nx)},${f1(ny)}L${f1(bx + uy * hw)},${f1(by - ux * hw)}Z`);
  }
  // a request token: a small chat bubble with three dots, centred on its origin (about 34 x 28 at scale 1; its tail's tip
  // is at (-10, 16))
  const BUB = 'M-10,-12H10Q17,-12 17,-5V3Q17,10 10,10H-2L-10,16L-8.5,10H-10Q-17,10 -17,3V-5Q-17,-12 -10,-12Z';
  function bubble(p, sc, C) {
    const g = L.g(p, { opacity: 0 });
    const b = L.el(g, 'path', { d: BUB, fill: C.paper, stroke: C.ink2, 'stroke-width': 2.1 / sc, 'stroke-linejoin': 'round' });
    const dots = [-7, 0, 7].map(x => L.el(g, 'circle', { cx: x, cy: -1, r: 2.1, fill: C.ink2 }));
    return { g, b, dots };
  }

  let styled = false;
  L.csflow = function (el, o) {
    if (!styled) {   // math in the figure's words is set at the words' own size (MathJax would set it at 113%)
      styled = true; const st = document.createElement('style');
      st.textContent = '.lab.csf mjx-container { font-size: 100% !important; }';
      document.head.appendChild(st);
    }
    const C = L.C, font = o.font || 40, fs = o.fs || 36, X = o.X;
    // the layouts: X.ai, and X.noai (without AI) and X.price (the pricing layout) where given; what they leave out is X.ai's
    const LA = Object.assign({ D: o.D || 200, Y: o.Y || 560 }, X.ai), morph = !!X.noai;
    const L0 = Object.assign({}, LA, X.noai || {}), LP = Object.assign({}, LA, X.price || {});
    const mixL = (P, Q, t) => (t <= 0 ? P : t >= 1 ? Q : { D: L.mix(P.D, Q.D, t), Y: L.mix(P.Y, Q.Y, t), c: L.mix(P.c, Q.c, t), a: L.mix(P.a, Q.a, t),
      d: L.mix(P.d, Q.d, t), q: L.mix(P.q, Q.q, t), s: L.mix(P.s, Q.s, t), done: [L.mix(P.done[0], Q.done[0], t), L.mix(P.done[1], Q.done[1], t)] });
    const nq = o.queue || [4, 2], nMax = Math.max(nq[0], nq[1]), nStaff = o.staff || 1;
    const head = o.head || L.clamp(0.08 * LA.D, 12, 16), lw = o.lw || 2.75;
    const big = !o.small && !o.dec;                                                // the decision: big (its word inside) or not
    const dw = o.small ? (o.smallDec || 0.33) * LA.D : o.dec ? o.dec.w : 7.6 * font, dh = o.small ? dw : o.dec ? o.dec.h : dw / 2;
    const ink = C.ink2, quiet = tint(C.ink, 0.45);
    const TS = o.tile || 1.05, QD = o.qSize || 0.88, QP = o.pitch || 0.78, SP = o.staffPitch || 1.08;
    const W = Object.assign({ customer: 'Customer<br>requests', ai: 'AI agent', decision: 'Resolved?', yes: 'resolved', no: 'escalated',
                              done: 'Done', queue: 'Queue', staff: 'Human staff' }, o.words || {});
    const ann = o.ann || {};
    const root = L.g(o.parent || L.svg(el));
    const gFirm = L.g(root), gArr = L.g(root), gTok = L.g(root), gCard = L.g(root), gDec = L.g(root), gDone = L.g(root),
          gPeople = L.g(root), gPrice = L.g(root);
    const lab = (html, a) => html ? L.label(el, 0, 0, html, Object.assign({ anchor: 'ct', color: 'ink', cls: 'csf', style: `font-size:${font}px` }, a)) : null;
    const N = { lab: {} };

    // ---- a layout's geometry: the AI agent's tile, the decision, Done, and the sizes that scale with the people
    function geo(G) {
      const D = G.D, Y = G.Y, T = TS * D, Dq = QD * D;
      return { G, D, r: D / 2, Y, T, Dq, Dn: o.doneSize || Math.min(72, 0.36 * D),         // Dn: Done's side, at most 72 px
               gap: L.clamp(0.065 * D, 8, 13), rr: 0.14 * D, pitch: QP * Dq, sPitch: SP * D,  // gap: from an arrow to a piece
               lab: Y + Math.max(T, D) / 2 + 0.1 * D,                                 // the words' top, under the tallest piece
               card: { x0: G.a - T / 2, x1: G.a + T / 2, y0: Y - T / 2, y1: Y + T / 2 },
               dec: { l: G.d - dw / 2, r: G.d + dw / 2, t: Y - dh / 2, b: Y + dh / 2 }, dn: { x: G.done[0], y: G.done[1] } };
    }
    // the line's back edge on the flow line, n people in it (n may be fractional: the back of the line steps away)
    const backOf = (g, q, n) => q - (Math.max(1, n) - 1) * g.pitch - g.Dq / 2;

    // ---- the AI agent on its tile, the decision, Done and the two exits
    N.card = L.rect(gCard, 0, 0, 0, 0, { r: 0, fill: tint(C.ink, 0.045) });
    N.robot = bust(gCard, 'ai');
    N.dec = L.path(big || o.dec ? gDec : gArr, '', { fill: 'paper', color: quiet, w: o.small ? 2.5 : 2.75 });
    N.doneBox = L.rect(gDone, 0, 0, 0, 0, { r: 0, fill: tint(C.teal, 0.08), color: tint(C.teal, 0.75), w: 2.5 });
    N.check = L.path(gDone, '', { color: 'teal', w: 3 });
    N.aIn = arrow(gArr, ink, lw, head); N.aAD = arrow(gArr, ink, lw, head);
    N.yes = arrow(gArr, C.teal, lw, head); N.no = arrow(gArr, C.red, lw, head);
    N.aLong = arrow(gArr, ink, lw, head); N.aQS = arrow(gArr, ink, lw, head);

    // ---- the people: the customer and her chat bubble; the line (gBack: the people who step away when the AI arrives),
    // its front drawn last, on top; the staff
    N.cust = person(gPeople, 'customer', C);
    N.bub = L.g(gPeople);
    N.bubLine = L.el(N.bub, 'path', { d: BUB, fill: C.paper, stroke: ink, 'stroke-linejoin': 'round' });
    [-7, 0, 7].forEach(x => L.el(N.bub, 'circle', { cx: x, cy: -1, r: 2.1, fill: ink }));
    const gQueue = L.g(gPeople), gBack = L.g(gQueue), gStay = L.g(gQueue);
    N.queue = [...Array(nMax)].map((_, i) => person(i >= nq[1] ? gBack : gStay, LINE[i % LINE.length], C));
    N.queue.slice().reverse().forEach(A => A.g.parentNode.appendChild(A.g));
    N.staff = [...Array(nStaff)].map((_, j) => person(gPeople, DESK[j % DESK.length], C));

    // ---- the words (CM glyphs sit high in their box: a word centred on y is placed at y + font / 3)
    N.lab.customer = lab(W.customer, { align: 'center', style: `font-size:${font}px;line-height:1.15` });
    N.lab.ai = lab(W.ai);
    N.lab.decision = o.small ? null : lab(W.decision, { anchor: big ? 'c' : o.decAt === 'nw' ? 'r' : 'ct', color: o.plainExits ? 'ink2' : 'ink' });
    // the exits' words keep clear of the tokens that ride on the lines (a token reaches about 14 px above a line, 16 below)
    N.lab.yes = lab(W.yes, { anchor: 'cb', color: o.plainExits ? 'ink2' : 'teal' });
    N.lab.no = lab(W.no, { anchor: 'ct', color: o.plainExits ? 'ink2' : 'red' });
    N.lab.done = lab(W.done, { anchor: 'l' });
    N.lab.queue = lab(W.queue);
    N.lab.staff = ann.staff ? null : lab(W.staff);
    N.lab.lambda = ann.lambda ? lab(ann.lambda, { anchor: 'cb', color: 'ink2', style: `font-size:${fs}px` }) : null;
    N.lab.sAnn = ann.staff ? lab(ann.staff, { anchor: 'l', style: `font-size:${fs}px;line-height:1.25`, color: 'ink2' }) : null;
    N.lab.util = ann.util ? lab(ann.util, { anchor: 'ct', style: `font-size:${fs}px`, color: 'ink2' }) : null;

    // ---- the buyer's boundary and the pricing highlight
    if (o.firm) {
      const r = o.firm;
      L.rect(gFirm, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, { color: 'ink3', w: 2.5, r: 30 }).setAttribute('stroke-dasharray', '11 9');
      N.lab.firm = lab(r.label || 'Buyer: a firm'    , { anchor: 'r', color: 'ink',     style: `font-size:${fs}px;background:var(--paper);padding:0 12px` });
      L.place(N.lab.firm, r.x1 - 34, r.y0);
    }
    if (o.price) {
      N.price = L.rect(gPrice, 0, 0, 0, 0, { color: 'orange', w: 3, r: 0 });
      N.price.setAttribute('stroke-dasharray', '12 9');
      N.lab.price = lab(o.price.label || 'How to price the AI service?', { anchor: 'cb', style: `font-size:${o.price.font || 1.1 * font}px` });
    }

    // ---- the request tokens (the live flow): small, whatever the people's size (the exits' words keep clear of them)
    const tsc = L.clamp(LA.D / 180, 0.8, 1), tw = 17 * tsc;                        // tw: a token's half width
    N.tok = [...Array(8)].map(() => bubble(gTok, tsc, C));
    const hideTok = () => N.tok.forEach(t => t.g.setAttribute('opacity', 0));

    const aiOnly = [gCard, gDec, gDone, N.aIn.g, N.aAD.g, N.yes.g, N.no.g];
    const aiLabs = ['ai', 'decision', 'yes', 'no', 'done', 'lambda'];
    const F = { N };
    let cur = null;                                                                // the layout last drawn (for the tokens)
    F.draw = function (s) {
      s = s || {};
      const m = s.m === undefined ? 1 : s.m, hi = s.hi || 0, dimv = sm(L.clamp(s.dim || 0)), fade = s.fade === undefined ? 1 : s.fade;
      const p = morph ? sm(L.sub(m, 0, 0.6)) : 1, f = morph ? sm(L.sub(m, 0.65, 0.95)) : 1;
      const u = morph ? sm(L.sub(m, 0, 0.32)) : 1;                                // the back of the line steps away, early
      const dk = 1 - 0.62 * dimv;
      const g = geo(mixL(mixL(L0, LA, p), LP, L.clamp(s.z || 0))), G = g.G, y = g.Y, r = g.r;
      const { card, dec, dn, Dn, gap, rr } = g;
      hideTok();
      root.style.opacity = fade;
      // the AI agent's tile, the decision, Done
      L.attrs(N.card, { x: f1(card.x0), y: f1(card.y0), width: f1(g.T), height: f1(g.T), rx: f1(0.18 * g.T) });
      put(N.robot, 'ai', G.a, y, g.T);
      N.dec.setAttribute('d', `M${f1(dec.l)},${f1(y)}L${f1(G.d)},${f1(dec.t)}L${f1(dec.r)},${f1(y)}L${f1(G.d)},${f1(dec.b)}Z`);
      L.attrs(N.doneBox, { x: f1(dn.x - Dn / 2), y: f1(dn.y - Dn / 2), width: f1(Dn), height: f1(Dn), rx: f1(0.27 * Dn) });
      N.check.setAttribute('d', `M${f1(dn.x - 0.21 * Dn)},${f1(dn.y + 0.01 * Dn)}L${f1(dn.x - 0.06 * Dn)},${f1(dn.y + 0.16 * Dn)}L${f1(dn.x + 0.23 * Dn)},${f1(dn.y - 0.15 * Dn)}`);
      N.check.setAttribute('stroke-width', f1(Math.max(3, 0.055 * Dn)));
      // the people, centred on the flow line: the line moves as one, and its back steps away as it starts to move
      seat(N.cust, G.c, y, g.D);
      const bs = L.clamp(0.0068 * g.D, 0.7, 1.45), ba = -0.75, br = r + 0.6 * gap;  // the bubble's tail points at her circle
      N.bub.setAttribute('transform', `translate(${f1(G.c + br * Math.cos(ba) + 10 * bs)},${f1(y + br * Math.sin(ba) - 16 * bs)}) scale(${bs.toFixed(3)})`);
      N.bubLine.setAttribute('stroke-width', (2.1 / bs).toFixed(2));
      N.queue.forEach((A, i) => seat(A, G.q - i * g.pitch, y, g.Dq));
      gBack.style.opacity = 1 - u;
      N.staff.forEach((A, j) => seat(A, G.s + j * g.sPitch, y, g.D));
      // nVis: the people in line (for its word); the long arrow keeps to the back of the line until the people who step
      // away are nearly gone, so it never shows through them
      const nVis = morph ? L.mix(nq[0], nq[1], u) : nq[1], nArr = morph ? L.mix(nq[0], nq[1], sm(L.sub(u, 0.7, 1))) : nq[1];
      const back = backOf(g, G.q, nArr), backAI = backOf(g, G.q, nq[1]), front = G.q + g.Dq / 2;
      const custR = G.c + r, staffL = G.s - r;
      // the arrows: without AI, the long one into the line; with AI, in, to the decision and the two exits
      setArrow(N.aLong, [[custR + gap, y], [back - gap, y]], rr);
      setArrow(N.aQS, [[front + gap, y], [staffL - gap, y]], rr);
      const R = {
        in: [[custR + gap, y], [card.x0 - gap, y]], ad: [[card.x1 + gap, y], [dec.l - gap, y]],
        yes: [[G.d, dec.t - (o.small ? 0.6 * gap : 0)], [G.d, dn.y], [dn.x - Dn / 2 - gap, dn.y]],
        no: [[dec.r + (o.small ? 0.6 * gap : 0), y], [backAI - gap, y]] };
      setArrow(N.aIn, R.in, rr); setArrow(N.aAD, R.ad, rr); setArrow(N.yes, R.yes, rr); setArrow(N.no, R.no, rr);
      N.aLong.g.style.opacity = (1 - f) * dk;
      // the words: one line under the pieces (under the tallest), the exits' words by their arrows
      const yl = g.lab;
      if (N.lab.customer) L.place(N.lab.customer, G.c, yl);
      if (N.lab.ai) L.place(N.lab.ai, G.a, yl);
      if (N.lab.decision) { if (big) L.place(N.lab.decision, G.d, y + font / 3);
                            else if (o.decAt === 'nw') L.place(N.lab.decision, G.d - 0.4 * font, dec.t - 0.6 * font + font / 3);
                            else L.place(N.lab.decision, G.d, dec.b + 0.3 * font); }
      if (N.lab.yes) L.place(N.lab.yes, (G.d + rr + dn.x - Dn / 2 - gap) / 2, dn.y - 0.18 * font);
      if (N.lab.no) L.place(N.lab.no, (R.no[0][0] + R.no[1][0]) / 2 + (o.noDx || 0), y + 0.6 * font);
      if (N.lab.done) L.place(N.lab.done, dn.x + Dn / 2 + 18, dn.y + font / 3);
      if (N.lab.lambda) L.place(N.lab.lambda, (R.in[0][0] + (o.firm ? Math.min(o.firm.x0, R.in[1][0]) : R.in[1][0])) / 2, y - 12);
      if (N.lab.queue) L.place(N.lab.queue, G.q - (nVis - 1) * g.pitch / 2, yl);
      if (N.lab.staff) L.place(N.lab.staff, G.s + (nStaff - 1) * g.sPitch / 2, yl);
      if (N.lab.sAnn) L.place(N.lab.sAnn, G.s + (nStaff - 1) * g.sPitch + r + 18, y);
      if (N.lab.util) L.place(N.lab.util, (G.q - (nVis - 1) * g.pitch + G.s + (nStaff - 1) * g.sPitch) / 2, yl + (N.lab.queue || N.lab.staff ? 1.3 * font : 0));
      if (N.price) {
        const pb = { x0: card.x0 - 16, x1: card.x1 + 16, y0: card.y0 - 16, y1: yl + 1.2 * font + 10 };
        L.attrs(N.price, { x: f1(pb.x0), y: f1(pb.y0), width: f1(pb.x1 - pb.x0), height: f1(pb.y1 - pb.y0), rx: f1(0.18 * g.T + 14) });
        L.place(N.lab.price, G.a, pb.y0 - 16);
      }
      // the AI part fades in; dimming leaves the AI agent (its tile, the robot, its word) and the pricing highlight alone
      aiOnly.forEach(n => { n.style.opacity = f * (n === gCard ? 1 : dk); });
      const op = (key, v) => { const n = N.lab[key]; if (n) n.style.opacity = v * fade; };
      aiLabs.forEach(key => op(key, f * (key === 'ai' ? 1 : dk)));
      [N.cust.g, N.bub, gQueue, ...N.staff.map(A => A.g), N.aQS.g, gFirm].forEach(n => { n.style.opacity = dk; });
      ['customer', 'queue', 'staff', 'sAnn', 'util', 'firm'].forEach(key => op(key, dk));
      if (N.price) { N.price.style.opacity = hi; op('price', hi); }
      cur = { g, R, custR, back, backAI, front, staffL };
    };

    

    F.live = function (lo) {
      lo = lo || {};
      if (!cur) F.draw({ m: lo.m });                                               // the engine has drawn the click already
      const c = cur, g = c.g, G = g.G, y = g.Y, pad = g.gap, rr = g.rr, card = g.card, dec = g.dec, dn = g.dn;
      const ai = (lo.m === undefined ? 1 : lo.m) >= 0.5, v = lo.v || (0.9 * LA.D + 60), n = lo.n || 3, gap = lo.gap || 1.4;
      const pat = lo.pattern || 'RER', deep = 2 * tw;                              // deep: how far a token goes under the tile
      const tracks = [];                                                           // per token: [{ R, t0, t1, fi, fo, col }]
      const leg = (P, t0, x) => { const R = route(P, rr); return Object.assign({ R, t0, t1: t0 + R.len / v }, x); };
      const serve = t => tracks.push([leg([[c.front + pad, y], [c.staffL - pad - head, y]], t, { fi: 1, fo: 1, col: 'ink2' })]);
      for (let i = 0; i < n; i++) {
        const t0 = 0.25 + i * gap;
        if (!ai) {
          const a = leg([[c.custR + pad, y], [c.back - pad - head, y]], t0, { fi: 1, fo: 1, col: 'ink2' });
          tracks.push([a]); serve(a.t1 + 0.9); continue;
        }
        // a big decision hides a token near its left corner; a smaller one, at its centre
        const a = leg([[c.custR + pad, y], [card.x0 + deep, y]], t0, { fi: 1, col: 'ink2' });
        const b = leg([[card.x1 - deep, y], big ? [dec.l + 2 * deep, y] : [G.d, y]], a.t1 + 0.45, { col: 'ink2' });
        const w = o.small ? 0 : 0.2;
        if (pat[i % pat.length] === 'R') {
          tracks.push([a, b, leg([[G.d, big ? dec.t + 2 * deep : y], [G.d, dn.y], [dn.x, dn.y]], b.t1 + w, { col: 'teal' })]);
        } else {
          const e = leg([[big ? dec.r - 2 * deep : G.d, y], [c.backAI - pad - head, y]], b.t1 + w, { fo: 1, col: 'red' });
          tracks.push([a, b, e]); serve(e.t1 + 0.9);
        }
      }
      const tEnd = Math.max(...tracks.map(T => T[T.length - 1].t1)) + 0.1, fadeT = 0.3, t0 = performance.now();
      let raf = 0;
      function frame(now) {
        const t = (now - t0) / 1000;
        let j = 0;
        tracks.forEach(T => {
          const x = T.find(q => t >= q.t0 && t <= q.t1);
          if (!x || j >= N.tok.length) return;
          const tk = N.tok[j++], pt = x.R.at((t - x.t0) * v), col = C[x.col] || C.ink2;
          let op = 1;
          if (x.fi) op = Math.min(op, sm(L.clamp((t - x.t0) / fadeT)));
          if (x.fo) op = Math.min(op, sm(L.clamp((x.t1 - t) / fadeT)));
          tk.g.setAttribute('transform', `translate(${f1(pt[0])},${f1(pt[1])}) scale(${tsc})`);
          tk.g.setAttribute('opacity', op.toFixed(3));
          tk.b.setAttribute('stroke', col); tk.dots.forEach(d => d.setAttribute('fill', col));
        });
        for (; j < N.tok.length; j++) N.tok[j].g.setAttribute('opacity', 0);
        if (t < tEnd) raf = requestAnimationFrame(frame); else hideTok();
      }
      raf = requestAnimationFrame(frame);
      const stop = () => { cancelAnimationFrame(raf); hideTok(); };
      stop.ms = Math.round(tEnd * 1000);                                           // how long the flow runs (for checks)
      return stop;
    };
    F.draw({ m: morph ? 0 : 1 });
    return F;
  };
})();
