// Who buys.
(function () {
  

  const T = [[0.1, 0.359], [0.24, 0.114], [0.53, 0.887], [0.62, 0.811], [0.56, 0.142], [0.86, 0.573]];
  const RANK = [0, 1, 2, 4, 3, 5];   // each dot's place from left to right in T and in SV: the moves start one after another
  const COST = 0.45;
  const P_U = 0.52, P_S = 0.95;
  

  const V0 = 0.6, GV = [0.18, 0.3, 0.41, 0.54, 0.74, 0.9], GW = [0.54, 0.62, 0.70, 0.78, 0.855, 0.93];
  const SV = T.map((t, i) => [GV[RANK[i]], V0]);
  const TO_W = RANK;                 // SV -> SW: each dot keeps its place from left to right (see the header)
  const SW = T.map((t, i) => [GW[TO_W[i]], P_S * GW[TO_W[i]]]);
  

  const D3 = 3000, D4 = 3600, D5 = 2600, LIFT = 160;
  const at3 = t => t * 1000 / D3, at4 = t => t * 1000 / D4;   // seconds into click 3 or 4 -> fraction of its tween
  const TOP = 1.03, XR = 1.02;   // the lines and regions end at v = TOP or gamma = XR (plot units)
  const PX0 = 130, PW = 770;      
  const RX = 1120;               

  const QX0 = 1150, QY0 = 600, QW = 480, QH = 300, QM = 3.6;
  const VY = [730, 880];         // the tops of the two verdicts (same value, same success value), left-aligned with the panel's axis
  const RW = 0.05;               // moving dots: a ring fades in or out over this band below the ray (plot units of v)
  const LGY = 222, LGX = 550;    

  let rlab, P, Q, dots, slopes, ringsU, ringsP, flat, ray, plab, plab2, buyReg, buyHat, legend;
  let qAx, qLab, qDots, qGuide, qPts, qPrice, qPlab, verd, FADE;
   
  const upTo = (pts, g) => {
    if (g <= 0) return '';
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const want = g * len[len.length - 1], q = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (len[i] <= want) { q.push(pts[i]); continue; }
      const f = (want - len[i - 1]) / (len[i] - len[i - 1]); q.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]); break;
    }
    return 'M' + q.map(v => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join('L');
  };

  const real = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);
  const smooth = x => x * x * (3 - 2 * x);
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mixHex = (a, b, t) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };

  Deck.slide({
    id: 'U02', section: 'UBP vs. PFS', title: 'Who buys', steps: 5,
    notes: [
  "Fix <b>one AI capability</b>. <b>Each dot</b> is a buyer type.",
  "Under usage-based pricing, she buys if her expected value is <b>at least</b> the price: everyone above this <b>flat line</b>.",
  "Under pay only for success, she pays the success price <b>only when</b> her task succeeds. With zero failure value, the slope of <b>her dashed line</b> is her success value.",
  "In the first <b>extreme</b>, all buyers have the same expected value. One usage price takes <b>all the surplus</b>: that's the first best, what the seller could earn if it <b>knew each type</b>.",
  "Pay only for success <b>can't do that</b>. Success value <b>falls</b> as success probability rises, so the buyers who value a success most <b>rarely pay</b>.",
  "In the <b>other extreme</b>, all buyers have the same success value, and pay only for success <b>reaches</b> the first best."
],
    html: `
      <style>
        .slide[data-id="U02"] .u02-col { position: absolute; width: ${1800 - RX}px; font-size: 40px; line-height: 1.45; }
        .slide[data-id="U02"] .u02-hd { font-size: 44px; line-height: 1.3; }
        .slide[data-id="U02"] .note { font-size: 36px; line-height: 1.4; }
        .slide[data-id="U02"] .u02-tag { position: absolute; font-size: 36px; line-height: 1.2; color: var(--ink2); }
         
        .slide[data-id="U02"] .u02-vd { position: absolute; left: ${QX0}px; width: ${1800 - QX0}px; font-size: 40px; line-height: 1.3; white-space: nowrap; }
        .slide[data-id="U02"] .u02-vd .u02-fb { font-size: 36px; color: var(--ink2); }
      </style>
      <div class="u02-tag" style="left:${PX0}px;top:140px">Under full outcome alignment</div>

      <div class="u02-col" style="left:${RX}px;top:212px" data-in="1" data-dim="2" data-out="3">
        <div class="u02-hd c-orange">usage price \\(p\\)</div>
        <div><b>Buyer</b> buys if \\(v_t(a) \\ge p\\)</div>
        </div>    
      

      <div class="u02-col" style="left:${RX}px;top:446px" data-in="2" data-out="3">
        <div class="u02-hd c-teal">success price \\(p\\)</div>
        <div><b>Buyer</b> buys if \\(v_t(a) \\ge p\\,\\gamma_t(a)\\)</div>
        </div>    

       
      <div class="u02-vd u02-v1" style="top:${VY[0]}px;opacity:0">Same expected value<br>\\(\\Longrightarrow\\)&nbsp; <span class="c-orange">UBP</span> wins <span class="u02-fb">(first best)</span></div>
      <div class="u02-vd u02-v2" style="top:${VY[1]}px;opacity:0">Same success value<br>\\(\\Longrightarrow\\)&nbsp; <span class="c-teal">PFS</span> wins <span class="u02-fb">(first best)</span></div>
`,
    init(el, L) {
      const svg = L.svg(el);
      P = L.plot({ x0: PX0, y0: 940, w: PW, h: 650 });
      const ax = L.axes(el, P, { x: '\\(\\gamma_t(a)\\)', xColor: 'gold', xNote: 'success probability', y: '\\(v_t(a)\\)', yColor: 'blue', yNote: 'expected value', yNoteDx: 126 });
      const [l0, lx, lxn, ly, lyn] = ax.labels;
      lx.style.fontSize = ly.style.fontSize = '40px'; lxn.style.fontSize = lyn.style.fontSize = '36px';
      lxn._anchor = [-100, 0]; L.place(lxn, P.x0 + P.w + 24, P.y0 + 30);
      l0._anchor = [-50, 0]; L.place(l0, P.x0, P.y0 + 12);    
      l0.style.fontSize = '36px';   

      const defs = L.el(svg, 'defs');
      const pt = L.el(defs, 'pattern', { id: 'u02-hatch-t', patternUnits: 'userSpaceOnUse', width: 16, height: 16, patternTransform: 'rotate(45)' });
      L.el(pt, 'line', { x1: 0, y1: 0, x2: 0, y2: 16, stroke: L.C.teal, 'stroke-width': 3, 'stroke-opacity': 0.4 });
      buyReg = L.path(svg, '', { fill: 'teal', fop: 0.07, color: 'none', w: 0 });
      buyHat = L.path(svg, '', { fill: 'url(#u02-hatch-t)', color: 'none', w: 0 });
      flat = L.line(svg, P.X(0), P.Y(1), P.X(XR), P.Y(1), { color: 'orange', w: 5 });
      ray = L.line(svg, P.X(0), P.Y(0), P.X(0.2), P.Y(1), { color: 'teal', w: 5 });
      rlab = L.label(el, 0, 0, 'slope \\(p\\)', { anchor: 'l', color: 'teal' });   

      slopes = T.map(() => L.line(svg, P.X(0), P.Y(0), P.X(0), P.Y(0), { color: 'teal', w: 2.5, dash: '7 8', cap: 'butt', op: 0 }));
      ringsU = T.map(([x, y]) => L.ring(svg, P.X(x), P.Y(y), { color: 'orange', r: 23 }));
      ringsP = T.map(([x, y]) => L.ring(svg, P.X(x), P.Y(y), { color: 'teal', r: 23 }));
      dots = T.map(([x, y]) => L.dot(svg, P.X(x), P.Y(y), { r: 11 }));
      

      plab = L.label(el, P.X(XR) + 14, P.Y(P_U), '\\(p\\)', { anchor: 'l', color: 'orange', in: 1, dim: 2, out: 3 });
      plab2 = L.label(el, P.X(XR) + 14, P.Y(V0), '\\(p\\)', { anchor: 'l', color: 'orange' });
      plab.style.fontSize = plab2.style.fontSize = '40px'; plab2.style.opacity = 0;
      FADE = +getComputedStyle(document.documentElement).getPropertyValue('--fade') || 0.26;   

      legend = [L.rect(svg, LGX, LGY - 24, 44, 34, { r: 6, fill: 'teal', fop: 0.1, color: 'teal', w: 1.5 }),
        L.rect(svg, LGX, LGY - 24, 44, 34, { r: 6, fill: 'url(#u02-hatch-t)' }),
        L.label(el, LGX + 58, LGY, 'buys under PFS', { anchor: 'l', color: 'teal' })];   

      Q = L.plot({ x0: QX0, y0: QY0, w: QW, h: QH, ymax: QM });
      const qa = L.axes(el, Q, { x: '\\(\\gamma_t(a)\\)', xColor: 'gold', y: '\\(\\widetilde v_t(\\mathrm{success})\\)', yColor: 'teal', yNote: 'success value', yNoteDx: 236 });
      qAx = qa.g; qLab = qa.labels;
      qLab[1].style.fontSize = qLab[2].style.fontSize = '40px'; qLab[3].style.fontSize = '36px';
      qLab[0].style.fontSize = '36px'; qLab[0]._anchor = [-50, 0]; L.place(qLab[0], QX0, QY0 + 12);   // the origin's 0 under the corner, as on the left
      const g0 = V0 / (QM - 0.05);                     // where the same-value curve enters the panel
      qPts = []; for (let i = 0; i <= 120; i++) { const g = g0 + (1 - g0) * i / 120; qPts.push(Q.pt(g, V0 / g)); }
      qGuide = L.path(svg, '', { color: 'ink3', w: 3, dash: '10 9' });
      qPrice = L.line(svg, Q.X(0), Q.Y(P_S), Q.X(1), Q.Y(P_S), { color: 'teal', w: 4 });
      qPlab = L.label(el, Q.X(1) + 14, Q.Y(P_S), '\\(p\\)', { anchor: 'l', color: 'teal' });
      qPlab.style.fontSize = '40px';
      qDots = T.map(() => L.dot(svg, Q.X(0), Q.Y(0), { r: 10 }));
      verd = [el.querySelector('.u02-v1'), el.querySelector('.u02-v2')];
      // checks: the same-value dots above the cost; the same-success-value dots all right of the dashed line, so a
      // single success price serves each at a profit (first best); every success value inside the panel
      if (!(V0 > COST && Math.min(...SW.map(w => w[1])) > COST && Math.min(...SW.map(w => w[0])) > COST / P_S + 0.03)) console.warn('U02: check the extreme cases');
      if (Math.max(...SV.map(w => w[1] / w[0])) > QM - 0.05) console.warn('U02: a success value leaves the panel');
    },
    

    state: k => {
      const s = [
        { h: 1.08, hop: 0, s: 7, rop: 0, mode: 0 },
        { h: P_U, hop: 1, s: 7, rop: 0, mode: 1 },
        { h: P_U, hop: 0.22, s: P_S, rop: 1, mode: 2 }][Math.min(k, 2)];
      // from click 3 the usage line's height and opacity are drawn from m3, c4 and m5
      return Object.assign({}, s, { m3: k >= 3 ? 1 : 0, c4: k >= 4 ? 1 : 0, m5: k >= 5 ? 1 : 0, sl: k === 2 ? 1 : 0 });
    },
    dur: k => (k === 1 ? 1300 : k === 2 ? 1600 : k === 3 ? D3 * 0.4 : k === 4 ? D4 : k === 5 ? D5 : 1100),
    draw(el, s, L) {
      const p = s.s;                                    
      const ph = (e, a, b) => smooth(L.sub(real(e), a, b));   // a phase of one click, in real time
      const ext = s.m3 > 0;                            

      const up = ph(s.m3, at3(1.9), at3(2.3)), hu = L.mix(s.h, V0, up);
      const hop = L.mix(L.mix(L.mix(s.hop, 1, up), 0.22, ph(s.c4, 0, at4(0.4))), 0, ph(s.m5, 0, 0.15));
      L.seg(flat, P.X(0), P.Y(hu), P.X(XR), P.Y(hu)); flat.style.opacity = hop;
      plab.style.top = plab2.style.top = P.Y(hu) + 'px';
      // the second label: as faint as the dimmed first one (FADE) while the line is dimmed (0.22), in full with the line;
      // it takes over from the first label (which fades out) over the first 0.32 s of click 3
      const l2 = hop <= 0.22 ? hop / 0.22 * FADE : FADE + (1 - FADE) * (hop - 0.22) / 0.78;
      plab2.style.opacity = ext ? (l2 * ph(s.m3, 0, at3(0.32))).toFixed(3) : 0;
      const xe = Math.min(XR, TOP / p);                // the ray leaves the plot by the top or by the right edge
      L.seg(ray, P.X(0), P.Y(0), P.X(xe), P.Y(xe * p)); ray.style.opacity = s.rop;
      // the dots: T (clicks 0-2), then the same value (click 3, left to right), then the same success value (click 5,
      // right to left, so each dot stays ahead of its left neighbour); each dot starts a little after its neighbour
      const ramp = d => smooth(L.clamp(d / RW + 1));   

      const sW = Math.max(1 - ph(s.m3, 0, at3(0.3)), ph(s.c4, at4(0.12), at4(0.52)));
      const uW = ph(s.m3, at3(2.3), at3(2.6)) * (1 - ph(s.c4, 0, at4(0.4)));
      const grow = s.c4 > 0 ? ph(s.c4, at4(0.5), at4(1.3)) : 1;   

      const slop = (0.75 * Math.max(ext ? 1 - ph(s.m3, 0, at3(0.3)) : ph(s.sl, 0.45, 1), s.c4 > 0 ? 1 : 0)).toFixed(3);
      T.forEach((t0, i) => {
        const a = at3(0.3 + 0.105 * RANK[i]), f3 = ph(s.m3, a, a + at3(1.05));
        const b = 0.04 * (5 - RANK[i]), f5 = ph(s.m5, b, b + 0.42);
        const x = L.mix(L.mix(t0[0], SV[i][0], f3), SW[i][0], f5), y = L.mix(L.mix(t0[1], SV[i][1], f3), SW[i][1], f5);
        L.at(dots[i], P.X(x), P.Y(y)); L.at(ringsU[i], P.X(x), P.Y(y)); L.at(ringsP[i], P.X(x), P.Y(y));
        L.seg(slopes[i], P.X(0), P.Y(0), P.X(x * grow), P.Y(y * grow));
        slopes[i].style.opacity = slop;
        const bu = y >= hu - 1e-9;
        // above the ray: binary while the dots sit still (clicks 0-2, exactly as before); a short ramp from click 3 on
        const bp = ext ? ramp(y - p * x) : (y >= p * x - 1e-9 ? 1 : 0);
        let act;
        if (!ext) {
          ringsU[i].style.opacity = s.mode >= 0.5 && s.mode < 1.5 && bu ? 1 : 0;
          ringsP[i].style.opacity = s.mode >= 1.5 ? bp : 0;
          act = s.mode < 0.5 ? 1 : s.mode < 1.5 ? (bu ? 1 : 0) : bp;
        } else {
          ringsU[i].style.opacity = (bu ? uW : 0).toFixed(3);
          // Click 5: fade the ring out before travel, keep it hidden until landing, then restore it.
          const ring = 1 - ph(s.m5, b - 0.06, b) + ph(s.m5, b + 0.42, b + 0.48);
          ringsP[i].style.opacity = (sW * bp * ring).toFixed(3);
          act = L.clamp(1 - sW * (1 - bp) - (bu ? 0 : uW));
        }
        const fill = act >= 1 ? L.C.ink : act <= 0 ? L.C.ink3 : mixHex(L.C.ink3, L.C.ink, act);
        dots[i].setAttribute('fill', fill);
        

        const qx = Q.X(x), qy = Q.Y(Math.min(QM, y / x));
        const c0 = at4(1.7 + 0.06 * (5 - RANK[i])), u = ph(s.c4, c0, c0 + at4(0.8));
        if (u >= 1) { L.at(qDots[i], qx, qy); qDots[i].setAttribute('r', 10); }
        else {
          const A = [P.X(x), P.Y(y)], C = [A[0] + 0.1 * (qx - A[0]), A[1] + 0.1 * (qy - A[1]) - LIFT], v = 1 - u;
          L.at(qDots[i], v * v * A[0] + 2 * u * v * C[0] + u * u * qx, v * v * A[1] + 2 * u * v * C[1] + u * u * qy);
          qDots[i].setAttribute('r', (11 - u).toFixed(2));
        }
        qDots[i].style.opacity = u > 0 ? 1 : 0;
        qDots[i].setAttribute('fill', fill);
      });
      // the buyers' region: above the ray, inside the plot
      const bq = xe < XR ? [[0, 0], [xe, TOP], [0, TOP]] : [[0, 0], [XR, XR * p], [XR, TOP], [0, TOP]];
      buyReg.setAttribute('d', 'M' + bq.map(q => P.X(q[0]).toFixed(1) + ',' + P.Y(q[1]).toFixed(1)).join('L') + 'Z');
      buyHat.setAttribute('d', buyReg.getAttribute('d'));
      

      [buyReg, buyHat, ...legend].forEach(n => { n.style.opacity = s.rop * sW; });
      ray.style.opacity = s.rop * sW;
      L.place(rlab, P.X(xe) + 14, P.Y(xe * p) + 6); rlab.style.opacity = (s.rop * sW).toFixed(3);   

      const qop = ph(s.c4, at4(1.3), at4(1.7));
      [qAx, ...qLab].forEach(n => { n.style.opacity = qop; });
      qGuide.setAttribute('d', upTo(qPts, ph(s.c4, at4(2.85), at4(3.55))));
      qGuide.style.opacity = (1 - ph(s.m5, 0, 0.15)).toFixed(3);
      qPrice.style.opacity = qPlab.style.opacity = ph(s.m5, 0.72, 0.9).toFixed(3);
      verd[0].style.opacity = (ph(s.m3, at3(2.55), 1) * (1 - 0.6 * ph(s.m5, 0.05, 0.3))).toFixed(3);
      verd[1].style.opacity = ph(s.m5, 0.8, 1).toFixed(3);
    }
  });
})();
