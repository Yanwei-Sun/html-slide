// Who decides what counts as a success?.
(function () {
  const IW = 2270, IH = 2216;                                  // the image's own pixels
  // ---------------- the walk (clicks 1-3), in the image's pixels; times in seconds from the click ----------------
  const VEIL = 0.62, QB = 0.6, QT = 0.5;       // veil strength; contrast of the boxes and of the connectors already passed
  const SP = 1400, SPN = 2000, FADE = 0.35, SHRINK = 0.4, GLIDE = 1.3, GROW = 0.85, ZOOM_MS = 600;
  

  const CUT_MS = 250, CUT = [0.42, 0.5];
  

  const CAM1 = { x: 520, y: 149.4, s: 0.58 }, CAM2 = { x: 400, y: -225, s: 0.55 }, CAM3 = { x: 580, y: -479.4, s: 0.55 };    
  const E12 = 0.95, E3 = 0.9, SWI = 3 / CAM3.s;   // the steps' scales at full size; the outline's 3 stage px, in image px
  const img = (cam, q) => (q - cam.y) / cam.s, imgX = (cam, q) => (q - cam.x) / cam.s;   // stage -> image px
  const ss = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const lin = p => (p <= 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2);   // inverse of Deck.ease: a steady pace
  const sub = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const mix = (a, b, t) => a + (b - a) * t;
  const rrect = ([x0, y0, x1, y1], r) => `M${x0 + r},${y0}H${x1 - r}A${r},${r} 0 0 1 ${x1},${y0 + r}V${y1 - r}A${r},${r} 0 0 1 ${x1 - r},${y1}` +
    `H${x0 + r}A${r},${r} 0 0 1 ${x0},${y1 - r}V${y0 + r}A${r},${r} 0 0 1 ${x0 + r},${y0}Z`;
  // the boxes on the path, [x0, y0, x1, y1] with their border
  const BOX = {
    req: [296, 1, 807, 263],        // End user's final request was understood
    botA: [4, 335, 515, 596],       // Bot responded based on help center articles
    botF: [588, 335, 1099, 596],    // Bot responded with an answer flow
    fin: [296, 668, 807, 930],      // End user reached the final step in the flow
    pos: [8, 1106, 520, 1368],      // positive feedback ("Yes, problem solved")
    none: [589, 1106, 1101, 1368],  // no feedback
    neg: [1171, 1106, 1682, 1367],  // negative feedback ("No, I still need help")
    h72: [199, 1440, 913, 1526],    // Conversation ended after 72 hours (a pill)
    rel: [9, 1601, 520, 1862],      // AI evaluation marked the response as relevant
    nrel: [604, 1601, 1115, 1862],  // ... as not relevant
    auto: [14, 1964, 514, 2214],    // Automated resolution
    unres: [610, 1964, 1109, 2214]  // Unresolved
  };
  

  const M3 = E3 / CAM3.s, Y3 = img(CAM3, 298), YB = img(CAM3, 992), R3 = [-4, 1372, 1124, 2216];
  const OL = [-8, 1132, 1879];      

  const g3 = (YB - Y3 - (86 + OL[2] - 1556.5 + 37 + 278) * M3 - 1.5 * SWI) / 4;
  // at full size: the connector's top edge (Ya) and the ring's top (Yo)
  const Ya = Y3 + 86 * M3 + SWI + 2 * g3, Yo = Ya + (OL[2] - 1556.5 + 37) * M3 + SWI / 2 + 2 * g3;
  const fix = (y, Y) => [555.5, (M3 * y - Y) / (M3 - 1)];      

  const M1 = E12 / CAM1.s, M2 = E12 / CAM2.s, X1 = imgX(CAM1, 1174);
  const STEP = [null,
    { k: 1, boxes: ['req', 'botA', 'botF'], R: [-2, -5, 1104, 602], A: [(X1 - M1 * 1099) / (1 - M1), 1], M: M1 },
    { k: 2, boxes: ['pos', 'none', 'neg'], R: [2, 1054, 1688, 1374], A: [555.5, 1063.5], M: M2 },
    { k: 3, boxes: ['h72'], A: fix(1440, Y3), M: M3 },
    { k: 3, boxes: ['rel', 'nrel'], A: fix(1556.5, Ya), M: M3 },
    { k: 3, boxes: ['auto', 'unres'], A: fix(1950, Yo), M: M3 }];
  

  const TR = [], LIT = {}, AT = {}, G = [null], DUR = [0];
  const ONE = (j, x, y) => [x, y];
  function run(k, t0, pts, o) {
    const f = typeof pts === 'function' ? pts : () => pts, q = f(ONE, 0), c = o.closed ? q.concat([q[0]]) : q;
    let len = 0; for (let i = 1; i < c.length; i++) len += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
    const t1 = t0 + len / (o.sp || SP);
    TR.push(Object.assign({ k, t0, t1, f }, o)); return t1;
  }
  const lit = (k, keys, t) => keys.forEach(b => { LIT[b] = t; AT[b] = k; });
  const S1 = SHRINK - 0.02;                                    

  lit(1, ['req', 'botA', 'botF'], 1.4);
  let t = run(1, 1.4, [[551.5, 263], [551.5, 292.5]], { layer: 'in' });
  run(1, t, [[551.5, 292.5], [218.5, 292.5], [218.5, 335]], { layer: 'in' });
  run(1, t, [[551.5, 292.5], [843.5, 292.5], [843.5, 335]], { layer: 'in' });
  G[1] = 1.4 + FADE + 0.05; DUR[1] = G[1] + GROW;
  // click 2: articles down to the merge; the answer flow through its final step; three kinds of feedback
  const tA = run(2, S1, [[218.5, 596], [218.5, 996], [531, 996]], { layer: 'hi' });
  lit(2, ['fin'], run(2, S1, [[843.5, 596], [843.5, 625.5], [551.5, 625.5], [551.5, 668]], { layer: 'hi' }));
  const tF = run(2, LIT.fin + 0.06, [[556, 930], [556, 971]], { layer: 'hi' });
  t = run(2, Math.max(tA, tF), [[555.5, 971], [580, 995.5], [555.5, 1020], [531, 995.5]], { layer: 'hi', closed: true });   // the merge (diamond)
  t = run(2, t, P => [[555.5, 1020], [555.5, P(2, 555.5, 1063.5)[1]]], { layer: 'hi' });
  lit(2, ['pos'], run(2, t, [[555.5, 1063.5], [264, 1063.5], [264, 1106]], { layer: 'in' }));
  lit(2, ['neg'], run(2, t, [[555.5, 1063.5], [1434.5, 1063.5], [1434.5, 1106]], { layer: 'in' }));
  lit(2, ['none'], run(2, t + (845.5 - 555.5) / SP, [[845.5, 1063.5], [845.5, 1106]], { layer: 'in' }));
  // negative: straight to unresolved, meeting it where it does in the image, also while the lower block is enlarged
  const yN = P => P(5, 0, 2083.5)[1];
  const tN = run(2, LIT.neg, P => [[1682, 1236.5], [1718.5, 1236.5], [1718.5, yN(P)], [P(5, 1109, 0)[0] + 64, yN(P)]],
    { layer: 'lo', sp: SPN });
  lit(2, ['unres'], tN);
  G[2] = LIT.neg + 0.25; DUR[2] = Math.max(G[2] + GROW, tN + FADE);
  

  const sc3 = u => 1 + (M3 - 1) * u;
  const tip = (P, u) => mix(1941, (P(4, 0, OL[2])[1] + SWI / 2 + P(5, 0, 1950)[1] + 37 * sc3(u)) / 2, u);
  lit(3, ['h72'], run(3, S1, P => [[264, 1368], [264, P(3, 264, 1440)[1]]], { layer: 'hi' }));
  run(3, S1, P => [[832.5, 1368], [832.5, P(3, 832.5, 1440)[1]]], { layer: 'hi' });
  t = run(3, LIT.h72 + 0.06, P => [[555.5, P(3, 555.5, 1526)[1]], [555.5, P(4, 555.5, 1562.5)[1]]], { layer: 'hi', sp: SPN, w: 1 });
  lit(3, ['rel'], run(3, t, [[555.5, 1562.5], [264, 1562.5], [264, 1601]], { layer: 'in', g: 4, sp: SPN }));
  lit(3, ['nrel'], run(3, t, [[555.5, 1562.5], [847.5, 1562.5], [847.5, 1601]], { layer: 'in', g: 4, sp: SPN }));
  const arrow = x => (P, u) => [P(4, x, 1862), [P(4, x, 0)[0], tip(P, u) - 23 * sc3(u)]];
  const tH = run(3, LIT.rel + 0.06, arrow(264), { layer: 'hi', sp: SPN, w: 1 });
  run(3, LIT.rel + 0.06, arrow(847.5), { layer: 'hi', sp: SPN, w: 1 });
  lit(3, ['auto'], tH + 0.02);
  G[3] = LIT.h72 + 0.25; const BG3 = tH + 0.05;                // the region turns white once all its connectors are drawn
  const OUT = [G[3] + 0.25, G[3] + GROW], RING = [G[3] + 0.35, G[3] + GROW + 0.1]; DUR[3] = RING[1];
  // the arrowheads: the click, the time they appear, the image's shape, its tip, and where the tip goes (and the scale)
  const HEADS = [[3, tH, 'M244,1904L258,1918L270,1918L284,1904L284,1921L264,1941L244,1921Z', [264, 1941], (P, u) => [P(4, 264, 0)[0], tip(P, u), sc3(u)]],
                 [3, tH, 'M827.5,1904L841.5,1918L853.5,1918L867.5,1904L867.5,1921L847.5,1941L827.5,1921Z', [847.5, 1941], (P, u) => [P(4, 847.5, 0)[0], tip(P, u), sc3(u)]],
                 [2, tN, 'M1152,2085L1169,2065L1187,2065L1173,2079L1173,2091L1187,2105L1169,2105Z', [1152, 2085], P => [P(5, 1109, 0)[0] + 43, yN(P) + 1.5, 1]]];

  // ---------------- the camera: the image's top-left corner at stage (x, y), s stage px per image px ----------------
  const S0 = 840 / IH, CAM0 = { x: 1800 - IW * S0, y: 180, s: S0 };   

  const PAN = [0, GLIDE, G[2] + GROW / 2, G[3] + GROW / 2];
  // the AI evaluation step, magnified: the panel's crop (RL), centred on C
  const C = [562, 1716];
  const PANEL = { x: 120, y: 170, w: 1680, h: 480, s: 1.4 };    // from click 4 (stage px; s: the magnification)
  const RL = [C[0] - PANEL.w / PANEL.s / 2, C[1] - PANEL.h / PANEL.s / 2, C[0] + PANEL.w / PANEL.s / 2, C[1] + PANEL.h / PANEL.s / 2];
  const CAMZ = { x: PANEL.x - RL[0] * PANEL.s, y: PANEL.y - RL[1] * PANEL.s, s: PANEL.s };
  // from camera A to camera B: the anchor a (image px) travels straight, and the scale changes at an even rate
  function glide(A, B, a, e) {
    const s = A.s * Math.pow(B.s / A.s, e);
    return { x: mix(A.x + a[0] * A.s, B.x + a[0] * B.s, e) - a[0] * s, y: mix(A.y + a[1] * A.s, B.y + a[1] * B.s, e) - a[1] * s, s };
  }
  let walk = null, clip, tree, col, capA, capB, corner;

  function buildWalk(el, L) {
    const svg = el.querySelector('.m09-walk'), mk = (p, tag, a) => L.el(p, tag, a);
    const veil = mk(svg, 'rect', { x: 0, y: 0, width: IW, height: IH, fill: '#fff', opacity: 0 });
    const line = { fill: 'none', stroke: L.C.ink2, 'stroke-width': 12, 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter',
                   pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, opacity: 0 };
    const rect = ([x0, y0, x1, y1], a) => Object.assign({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, a);
    

    const erase = mk(svg, 'rect', { x: 1704, y: 822, width: 28, height: 280, fill: '#fff', opacity: 0 });
    

    const cover1 = mk(svg, 'path', { d: 'M-10,598H1150V655H1711V1057.5H-10Z', fill: '#fff', opacity: 0 });
    const erase3 = mk(svg, 'g', { opacity: 0 });
    mk(erase3, 'path', { d: 'M1682,1236.5H1718.5V2083.5H1152', fill: 'none', stroke: '#fff', 'stroke-width': 16 });
    mk(erase3, 'rect', { x: 1149, y: 2062, width: 41, height: 46, fill: '#fff' });
    const lo = mk(svg, 'g');
    

    const box = {}, grp = [null]; let bg3;
    const add = (g, R, k) => {
      const [x0, y0, x1, y1] = BOX[k], m = 1, r = [Math.max(x0 - m, R[0]), Math.max(y0 - m, R[1]), Math.min(x1 + m, R[2]), Math.min(y1 + m, R[3])];
      const b = { bg: mk(g, 'rect', rect(r, { fill: '#fff', opacity: 0 })) };
      b.win = mk(g, 'svg', rect(r, { viewBox: `${r[0]} ${r[1]} ${r[2] - r[0]} ${r[3] - r[1]}`, opacity: 0 }));
      mk(b.win, 'image', { href: 'assets/zendesk_help_automated_resolution.png', x: 0, y: 0, width: IW, height: IH });
      box[k] = b;
    };
    for (let j = 1; j <= 5; j++) {
      if (j === 3) bg3 = mk(svg, 'rect', rect(R3, { fill: '#fff', opacity: 0 }));
      const S = STEP[j], g = mk(svg, 'g'), bg = S.R ? mk(g, 'rect', rect(S.R, { fill: '#fff', opacity: 0 })) : null;
      S.boxes.forEach(k => add(g, S.R || R3, k));
      grp.push({ g, bg });
    }
    add(mk(svg, 'g'), [-1e4, -1e4, 1e4, 1e4], 'fin');                // passed on the way to the feedback; never enlarged
    const hi = mk(svg, 'g');
    const traces = TR.map(q => ({ q, n: mk(q.layer === 'in' ? grp[q.g || q.k].g : q.layer === 'lo' ? lo : hi, 'path', Object.assign({ d: '' }, line)) }));
    const heads = HEADS.map(([k, t0, d, d0, pl]) => ({ k, t0, d0, pl, n: mk(hi, 'path', { d, fill: L.C.ink2, opacity: 0 }) }));
    const [x0, y0, x1, y1] = BOX.auto, o = 9;
    const ring = mk(grp[5].g, 'path', { fill: 'none', stroke: L.C.orange, 'stroke-width': 10, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1,
      d: rrect([x0 - o, y0 - o, x1 + o, y1 + o], 26) });
    // the zoom: white over everything but the AI evaluation step, and the purple outline around it (3 stage px at any scale)
    const zveil = mk(svg, 'path', { fill: '#fff', 'fill-rule': 'evenodd', opacity: 0 });
    const frame = mk(svg, 'path', { fill: 'none', stroke: L.C.purple, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, opacity: 0 });
    const pts = q => 'M' + q.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    // w: the walk, 0..3 (click k ends at w = k); z: the zoom, 0..1; s: the camera's scale
    return function draw(w, z, s) {
      const tz = lin(z), f = ss(sub(tz, 0, 0.35)), gz = ss(sub(tz, 0, 0.4)), zc = Deck.ease(sub(tz, 0.06, 1));
      // at the zoom the lower block first settles back (back); then, in place, its connectors, ring and white region fade
      // (fz) as the image's own connectors come back at full contrast
      const back = Deck.ease(sub(tz, 0, 0.24)), fz = ss(sub(tz, 0.22, 0.4));
      const T = [0]; for (let k = 1; k <= 3; k++) T.push(lin(L.clamp(w - (k - 1))) * DUR[k]);   // seconds into each click
      // act: 1 while the click is the current one (click 3 stays so through the zoom); m: each group's enlargement
      const act = [0, 1, 1, 1], m = [1];
      for (let k = 1; k < 3; k++) act[k] = 1 - Deck.ease(sub(T[k + 1], 0, SHRINK));
      for (let j = 1; j <= 5; j++) {
        const k = STEP[j].k, gone = k < 3 ? 1 - act[k] : back;
        m.push(1 + (STEP[j].M - 1) * Deck.ease(sub(T[k], G[k], G[k] + GROW)) * (1 - gone));
      }
      const u = (m[4] - 1) / (M3 - 1);                          // the lower block's growth
      const P = (j, x, y) => { const A = STEP[j].A; return [A[0] + m[j] * (x - A[0]), A[1] + m[j] * (y - A[1])]; };
      const vo = VEIL * ss(sub(T[1], 1.0, 1.5)) * (1 - f);
      veil.setAttribute('opacity', vo.toFixed(3));
      for (let j = 1; j <= 5; j++) {
        const A = STEP[j].A, e = m[j];
        grp[j].g.setAttribute('transform', `matrix(${e.toFixed(4)},0,0,${e.toFixed(4)},${(A[0] * (1 - e)).toFixed(2)},${(A[1] * (1 - e)).toFixed(2)})`);
        if (!grp[j].bg) continue;
        const bg = L.clamp((e - 1) / ((STEP[j].M - 1) * 0.03));
        grp[j].bg.setAttribute('opacity', bg.toFixed(3));
        if (j === 1) cover1.setAttribute('opacity', ss((e - 1) / ((STEP[1].M - 1) * 0.4)).toFixed(3));   // fades as it grows
        if (j === 2) erase.setAttribute('opacity', bg.toFixed(3));
      }
      const B3 = L.clamp((T[3] - BG3) / 0.03) * (1 - fz);
       
      const b3 = [Math.min(R3[0], ...[3, 4, 5].map(j => P(j, R3[0], 0)[0])), R3[1],
                  Math.max(R3[2], ...[3, 4, 5].map(j => P(j, R3[2], 0)[0])), Math.max(R3[3], P(5, 0, R3[3])[1])];
      L.attrs(bg3, rect(b3, {}));
      bg3.setAttribute('opacity', B3.toFixed(3)); erase3.setAttribute('opacity', B3.toFixed(3));
      

      for (const k in box) {
        const on = ss((T[AT[k]] - LIT[k]) / FADE), a = k === 'unres' ? 1 : act[AT[k]];
        let op = on * (QB + (1 - QB) * Math.max(a, f));
        if (AT[k] === 3) op += B3 * (1 - op) * (1 - on) * (1 - vo);
        box[k].bg.setAttribute('opacity', on.toFixed(3)); box[k].win.setAttribute('opacity', op.toFixed(3));
      }
      traces.forEach(({ q, n }) => {
        const p = L.clamp((T[q.k] - q.t0) / (q.t1 - q.t0));
        n.setAttribute('d', pts(q.f(P, u)) + (q.closed ? 'Z' : '')); n.setAttribute('stroke-dashoffset', (1 - p).toFixed(4));
        if (q.w) n.setAttribute('stroke-width', (12 * sc3(u)).toFixed(2));
        n.setAttribute('opacity', p > 0 ? ((QT + (1 - QT) * act[q.k]) * (1 - (q.k === 3 ? fz : f))).toFixed(3) : 0);
      });
      heads.forEach(({ k, t0, d0, pl, n }) => {
        const [X, Y, c] = pl(P, u);
        n.setAttribute('transform', `matrix(${c.toFixed(4)},0,0,${c.toFixed(4)},${(X - c * d0[0]).toFixed(2)},${(Y - c * d0[1]).toFixed(2)})`);
        n.setAttribute('opacity', (ss((T[k] - t0) / 0.05) * (QT + (1 - QT) * act[k]) * (1 - (k === 3 ? fz : f))).toFixed(3));
      });
      const pr = sub(T[3], RING[0], RING[1]);
      ring.setAttribute('stroke-dashoffset', (1 - ss(pr)).toFixed(4)); ring.setAttribute('stroke-dasharray', pr < 1 ? '1 1' : 'none');
      ring.setAttribute('opacity', pr > 0 ? (1 - fz).toFixed(3) : 0);
      // the outline: around the AI evaluation pair as it stands, its top edge midway between the pill and the connector
      // below it (click 3), then out to the panel (click 4)
      const R = [P(4, OL[0], 0)[0], (P(3, 0, 1526)[1] + P(4, 0, 1556.5)[1]) / 2, P(4, OL[1], 0)[0], P(4, 0, OL[2])[1]].map((v, i) => mix(v, RL[i], zc));
      const r = 9 / s, po = sub(T[3], OUT[0], OUT[1]);
      zveil.setAttribute('d', `M-3000,-3000H${IW + 3000}V${IH + 3000}H-3000Z` + rrect(R, r)); zveil.setAttribute('opacity', gz.toFixed(3));
      frame.setAttribute('d', rrect(R, r)); frame.setAttribute('stroke-width', (3 / s).toFixed(3));
      frame.setAttribute('stroke-dashoffset', (1 - ss(po)).toFixed(4)); frame.setAttribute('stroke-dasharray', po < 1 ? '1 1' : 'none');
      frame.setAttribute('opacity', po > 0 ? 1 : 0);
    };
  }

  Deck.slide({
    id: 'M09',
    section: 'Motivation',
    title: 'Who decides what counts as a success?',
    steps: 4,
    notes: [
  "But who decides what counts as a success? Here's a <b>decision tree</b> Zendesk <b>published</b> for deciding which requests qualify. If the customer asks for a human, it's unresolved.",
  "Negative feedback goes <b>straight</b> to unresolved. With positive feedback, or <b>none at all</b>, the conversation ends after 72 hours. Then an AI evaluation marks the response as relevant or not, and <b>only</b> a relevant response counts as an automated resolution.",
  "And that's the <b>problem</b>: success is often a judgment call, and the seller's <b>own</b> AI makes it.",
  "The seller owns that AI, so it can <b>fine-tune</b> how the AI <b>judges</b>, and in ambiguous cases, decide in its own favor.",
  "Can the buyer <b>push back</b>? Yes, but at a verification cost: someone has to go back and <b>review</b> the <b>conversation</b>."
],
    html: `
      <style>
        .slide[data-id="M09"] .m09-cap {
          position: absolute; top: 150px; font-size: 40px; line-height: 1.2;
          color: var(--ink2); white-space: nowrap; z-index: 2;
        }
        .slide[data-id="M09"] .m09-clip { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 0; pointer-events: none; }
        .slide[data-id="M09"] .m09-tree { position: absolute; z-index: 0; }
        .slide[data-id="M09"] .m09-tree img,
        .slide[data-id="M09"] .m09-walk {
          position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; max-width: none;
        }
        .slide[data-id="M09"] .m09-walk { overflow: visible; pointer-events: none; }
        .slide[data-id="M09"] .m09-col { position: absolute; left: 120px; top: 536px; width: 780px; z-index: 2; }
        .slide[data-id="M09"] .m09-ctx { font-size: 40px; line-height: 1.3; color: var(--ink2); }
        .slide[data-id="M09"] .m09-line {
          position: absolute; left: 120px; width: 1680px;
          font-size: 48px; line-height: 1.2; text-align: center; z-index: 3;
        }
        .slide[data-id="M09"] .source { line-height: 1.3; }
      </style>
      <div class="m09-cap m09-capA" style="display:none"></div>
      <div class="m09-cap m09-capB" style="display:none"></div>
      <div class="m09-clip"><div class="m09-tree" role="img"
           aria-label="Zendesk's published decision tree for legacy AI-agent automated resolutions">
        <img src="assets/zendesk_help_automated_resolution.png" width="2270" height="2216" alt="">
        <svg class="m09-walk" viewBox="0 0 2270 2216" aria-hidden="true"></svg>
      </div></div>
      <div class="m09-col">
        <div class="m09-ctx">Zendesk provides AI agents<br>for customer support,<br>and charges per <span class="c-orange">automated resolution</span>.</div>
      </div>
      <div class="m09-line m09-corner" style="top:700px;opacity:0">But success is often a judgment call, made by the seller’s <span class="c-purple">AI evaluation</span>.</div>
      <div class="m09-line" style="top:792px" data-in="3"><b>The tension:</b> the seller may resolve ambiguous cases in its own favor.</div>
      <div class="m09-line" style="top:884px" data-in="4">The buyer can know the true outcome, but at a <b class="c-blue">verification cost</b>.</div>
      <div class="source">Source: <a href="https://support.zendesk.com/hc/en-us/articles/5352026794010-About-the-automated-resolutions-platform-prior-to-resolution-tiers" target="_blank" rel="noopener">Zendesk Help Center</a>.</div>`,
    init(el, L) {
      clip = el.querySelector('.m09-clip'); tree = el.querySelector('.m09-tree'); col = el.querySelector('.m09-col');
      capA = el.querySelector('.m09-capA'); capB = el.querySelector('.m09-capB'); corner = el.querySelector('.m09-corner');
      walk = buildWalk(el, L);
    },
     
    state: k => ({ c: Math.min(k, 1), z: k >= 2 ? 1 : 0 }),
    dur: k => (k === 1 ? CUT_MS : k === 2 ? ZOOM_MS : 600),
    draw(el, s) {
      if (!walk) return;
      

      const tc = lin(s.c), w = tc < CUT[0] ? 0 : 3;
      const dip = tc < CUT[0] ? 1 - ss(sub(tc, 0, CUT[0])) : ss(sub(tc, CUT[1], 1));
      const t1 = lin(Math.max(0, Math.min(1, w))) * DUR[1], tz = lin(s.z), zc = Deck.ease(sub(tz, 0.06, 1));
      // the camera: to the centre (click 1), down the tree with the walk (clicks 2, 3), then into the panel (click 4)
      const Tk = k => lin(Math.max(0, Math.min(1, w - (k - 1)))) * DUR[k];
      let cam = glide(CAM0, CAM1, [IW / 2, IH / 2], Deck.ease(sub(t1, 0, GLIDE)));
      if (w > 1) cam = glide(CAM1, CAM2, [555.5, 1063.5], Deck.ease(sub(Tk(2), 0, PAN[2])));
      if (w > 2) cam = glide(CAM2, CAM3, [555.5, 1440], Deck.ease(sub(Tk(3), 0, PAN[3])));
      if (tz > 0) {
        

        const A4 = STEP[4].A, m4 = 1 + (M3 - 1) * (1 - Deck.ease(sub(tz, 0, 0.24))), sb = CAM3.s * M3 / m4;
        const cb = { s: sb, x: CAM3.x + CAM3.s * A4[0] * (1 - M3) - sb * A4[0] * (1 - m4),
                     y: CAM3.y + CAM3.s * A4[1] * (1 - M3) - sb * A4[1] * (1 - m4) };
        cam = glide(cb, CAMZ, C, zc);
      }
      

      const e2 = w > 1 ? Deck.ease(sub(Tk(2), 0, PAN[2])) : 0, e3 = w > 2 ? Deck.ease(sub(Tk(3), 0, PAN[3])) : 0;
      const ramp = (a, b, c) => mix(mix(a, b, e2), c, e3).toFixed(1);
      const mo = (1 - ss(sub(t1, 0, 0.5))).toFixed(3),
        mask = `linear-gradient(to bottom, rgba(0,0,0,${mo}) ${ramp(116, 136, 124)}px, #000 ${ramp(146, 143, 130)}px, ` +
               `#000 ${ramp(946, 1000, 1000)}px, rgba(0,0,0,${mo}) ${ramp(984, 1022, 1022)}px)`;
      clip.style.webkitMaskImage = clip.style.maskImage = mask;
      Object.assign(tree.style, { left: cam.x.toFixed(2) + 'px', top: cam.y.toFixed(2) + 'px',
        width: (IW * cam.s).toFixed(2) + 'px', height: (IH * cam.s).toFixed(2) + 'px' });
      const f = ss(sub(tz, 0, 0.35));
      walk(w, s.z, cam.s);
      clip.style.opacity = dip.toFixed(3);                         
      const out = 1 - ss(sub(t1, 0, 0.38));                       // the text column and the caption fade as the tree sets off,
      col.style.opacity = capA.style.opacity = (out * dip).toFixed(3);   // and the caption returns in the left margin as it settles
      capB.style.opacity = (ss(sub(t1, 0.86, 1.34)) * (1 - f)).toFixed(3);
      corner.style.opacity = ss(sub(tz, 0.72, 1)).toFixed(3);     // once the panel has settled
    }
  });
})();
