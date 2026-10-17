// Application: customer service.
(function () {
  

  const FLOW = { D: 132, Y: 355, font: 36, fs: 36, dec: { w: 88, h: 60 }, decAt: 'nw', queue: [2, 2], staff: 2, staffPitch: 1.06, doneSize: 52,
                 X: { ai: { c: 214, a: 619, d: 898, q: 1209, s: 1395, done: [1020, 291] } },
                 words: { customer: null, ai: null, queue: null, staff: null, done: null,
                          yes: '<span class="c-gold">\\(\\gamma_t\\)</span>', no: '\\(1-{\\color{var(--gold)}\\gamma_t}\\)' },
                 plainExits: true, ann: { lambda: 'Requests: \\(\\lambda_t\\)', staff: '<div>\\(N_t\\) staff</div><div>at rate \\(\\mu_t\\)</div>' },
                 firm: { x0: 520, y0: 200, x1: 1798, y1: 470, label: '<b>Buyer: a firm</b>' } };    
  const TY = 510;                                            // the private type's top: 40 px under the box
  let F = null;

  // ---- the figure (clicks 2-5): congestion cost C against human utilization, 0..1, capacity at 1
  const X0 = 384, Y0 = 968, PW = 624, PT = 683, PH = Y0 - PT, YMAX = 8.6;
  const X = r => X0 + PW * r, YC = c => Y0 - PH * c / YMAX, Cq = r => r * r / (1 - r);
  const RTOP = (-YMAX + Math.sqrt(YMAX * YMAX + 4 * YMAX)) / 2;       // where the curve leaves the plot (0.889)
  const RB = 0.86, KQ = 0.64 / 0.86, RB2 = KQ * RB, RQ = 0.73;        

  const CX = 1084;                                                    // the text column
  const lin = p => (p <= 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2);   // inverse of Deck.ease
  const N = {};

  Deck.slide({
    id: 'U06', section: 'UBP vs. PFS', title: 'Application: customer service', steps: 3,
    notes: [
  "Back to customer service. Each request goes <b>first</b> to the AI agent, and the ones it can't resolve <b>join</b> the <b>queue</b> for the firm's human staff.",
  "The firm's type is its arrival rate, its staff and their service rate, and the AI's success probability. The <b>first three</b> set <b>how busy</b> the staff are.",
  "The AI's value to the firm is the congestion cost <b>it saves</b>: fewer requests reach the staff, so customers <b>wait less</b>.",
  "We assume congestion cost rises, and <b>rises faster</b>, as the staff get <b>busier</b>, like the waiting cost of an M/M/N queue."
],
    html: `
      <style>
        .slide[data-id="U06"] .u06-tag { position: absolute; left: 148px; top: 134px; font-size: 36px; line-height: 1.2; color: var(--ink2); white-space: nowrap; }
        .slide[data-id="U06"] .u06-type { position: absolute; left: 148px; top: ${TY}px; white-space: nowrap; }
        .slide[data-id="U06"] .u06-type .l1 { font-size: 36px; line-height: 1; }
        .slide[data-id="U06"] .u06-type .l2 { font-size: 36px; line-height: 1; color: var(--ink2); margin-top: 10px; }
        .slide[data-id="U06"] .col { position: absolute; left: ${CX}px; white-space: nowrap; }
        .slide[data-id="U06"] .u06-hd { font-size: 40px; line-height: 1.3; }
        

        .slide[data-id="U06"] .u06-eq { display: flex; align-items: baseline; font-size: 50px; line-height: 1.2; }
        .slide[data-id="U06"] .u06-eq .u06-term { display: inline-flex; flex-direction: column; align-items: center; }
        .slide[data-id="U06"] .u06-eq .u06-blab { width: 0; display: flex; flex-direction: column; align-items: center; margin-top: 6px; }
        .slide[data-id="U06"] .u06-eq .u06-blab span { font-size: 36px; line-height: 1.2; white-space: nowrap; color: var(--ink2); }
        .slide[data-id="U06"] .u06-asm { font-size: 36px; line-height: 1.3; }
        .slide[data-id="U06"] .u06-ex { font-size: 36px; line-height: 1.3; color: var(--ink2); }
        .slide[data-id="U06"] .u06-key { font-size: 40px; line-height: 1.3; }
      </style>
      <div class="u06-tag">Comparing the two formats under full outcome alignment, with binary types</div>
      <div class="u06-type" data-in="1">
        <div class="l1">Private type \\(t\\): \\(\\lambda_t, N_t, \\mu_t, {\\color{var(--gold)}\\gamma_t}\\)</div>
        <div class="l2">utilization without AI \\(\\rho_t = \\lambda_t/(N_t\\,\\mu_t)\\)</div></div>
      <div class="col u06-hd" style="top:510px" data-q="hd" data-in="2">Buyer’s expected value from the AI:</div>
      <div class="col" style="top:576px" data-in="2">
        <div class="u06-eq">
          <span data-p="v" class="c-blue">\\(v_t\\)</span><span data-p="eq">\\(\\;=\\;\\)</span>
          <span class="u06-term" data-p="a"><span>\\(\\underbrace{C(\\rho_t)\\vphantom{\\bigl(\\bigr)}}\\)</span><span class="u06-blab"><span>cost without the AI</span></span></span>
          <span data-p="mi" style="margin:0 0.4em">\\(-\\)</span>
          <span class="u06-term" data-p="b"><span>\\(\\underbrace{C\\bigl((1-{\\color{var(--gold)}\\gamma_t})\\,\\rho_t\\bigr)}\\)</span><span class="u06-blab"><span>cost with the AI</span></span></span>
        </div></div>
      <div class="col u06-asm" style="top:776px" data-in="3"><b>Assumption</b>: \\(C(\\cdot)\\) is increasing and convex.</div>
      <div class="col u06-ex" style="top:830px" data-in="3">Example: waiting cost of an M/M/N queue</div>`,
    after(el, L) {
      el.querySelectorAll('.u06-eq mjx-under').forEach(u => { u.style.color = L.C.ink3; });   // the underbraces in light grey
    },
    init(el, L) {
      const svg = L.svg(el);
      const pill = 'text-shadow:0 0 2px var(--paper),0 0 4px var(--paper),0 0 7px var(--paper),0 0 11px var(--paper),0 0 16px var(--paper)';   // a soft paper halo
      // ---- the buyer: a downstream firm (its AI agent, the line and the staff inside the dashed box), the customer outside
      F = L.csflow(el, FLOW);

      // ---- the figure: axes, capacity, the curve (click 2)
      N.ax = L.g(svg);
      L.arrow(N.ax, X0, Y0, X(1) + 36, Y0, { color: 'ink2', w: 3, head: 20 });
      L.arrow(N.ax, X0, Y0, X0, PT - 26, { color: 'ink2', w: 3, head: 20 });
      L.line(N.ax, X(1), Y0 - 8, X(1), Y0 + 8, { color: 'ink2', w: 3 });
      L.line(N.ax, X(1), Y0 - 12, X(1), PT, { color: 'ink3', w: 2.5, dash: '8 8' });       // capacity: the cost explodes there
      N.axLabs = [
        L.label(el, X0 - 12, Y0 + 10, '0', { anchor: 'rt', size: 's', color: 'ink2' }),
        L.label(el, X(1), Y0 + 22, '1', { anchor: 'ct', size: 's', color: 'ink2' }),
        L.label(el, X0 + 6, Y0 + 22, 'human utilization', { anchor: 'lt', color: 'ink2' }),
        L.label(el, X0 + 22, PT - 4, 'congestion cost \\(C\\)', { anchor: 'lt', color: 'ink2' })];
      N.curve = L.curve(svg, { pt: (r, c) => [X(r), YC(c)] }, Cq, 0, RTOP, { color: 'ink', w: 4, n: 160 });
      N.curve.setAttribute('pathLength', '1'); N.curve.setAttribute('stroke-dasharray', '1 1');
      // ---- the firm's construction: its levels C(rho_t), C((1 - gamma_t) rho_t), the cut, the drop
      const dash = { color: 'ink3', w: 2.5, dash: '6 7' };
      N.vR = L.line(svg, 0, 0, 0, 0, dash); N.vD = L.line(svg, 0, 0, 0, 0, dash);      // down to the axis
      N.gR = L.line(svg, 0, 0, 0, 0, dash); N.gD = L.line(svg, 0, 0, 0, 0, dash);      // across to the cost axis
      N.tR = L.line(svg, X0 - 8, YC(Cq(RB)), X0, YC(Cq(RB)), { color: 'ink2', w: 3 });
      N.tD = L.line(svg, X0 - 8, YC(Cq(RB2)), X0, YC(Cq(RB2)), { color: 'ink2', w: 3 });
      N.yR = L.label(el, X0 - 16, YC(Cq(RB)), '\\(C(\\rho_t)\\)', { anchor: 'r', style: 'font-size:36px' });
      N.yD = L.label(el, X0 - 16, YC(Cq(RB2)), '\\(C\\bigl((1-{\\color{var(--gold)}\\gamma_t})\\,\\rho_t\\bigr)\\)', { anchor: 'r', style: 'font-size:36px' });
      N.xR = L.label(el, X(RB), Y0 + 22, '\\(\\rho_t\\)', { anchor: 'ct', style: 'font-size:36px' });
      N.xD = L.label(el, X(RB2), Y0 + 22, '\\((1-{\\color{var(--gold)}\\gamma_t})\\,\\rho_t\\)', { anchor: 'ct', style: 'font-size:36px' });
      N.cut = L.arrow(svg, 0, 0, 1, 0, { color: 'gold', w: 5, head: 18 });            // the AI's cut, on the axis
      N.hQ = L.line(svg, 0, 0, 0, 0, dash);                                            // the moving pair's level, dot to drop
      N.drop = L.line(svg, 0, 0, 0, 0, { color: 'blue', w: 7, cap: 'butt' });          // v_t: the cost the AI saves
      N.ring = L.ring(svg, 0, 0, { r: 13, w: 3.5 });                                   // without the AI: rho_t
      N.dot = L.dot(svg, 0, 0, { r: 11 });                                             // with the AI: (1 - gamma_t) rho_t
      N.labV = L.label(el, X(RB) + 18, (YC(Cq(RB)) + YC(Cq(RB2))) / 2, '\\(v_t\\)', { anchor: 'l', color: 'blue', style: 'font-size:42px' });
      // the value's text: the equation's pieces light up with the figure's
      N.hd = el.querySelector('[data-q="hd"]');
      N.eq = ['v', 'eq', 'a', 'mi', 'b'].reduce((o, k) => { o[k] = el.querySelector(`[data-p="${k}"]`); return o; }, {});
    },
    

    state: k => ({ fig: k >= 2 ? 1 : 0, em: k >= 3 ? 1 : 0 }),
    dur: k => (k === 2 ? 0 : k === 3 ? 300 : 250),    
    draw(el, s, L) {
      if (!F || !N.ax) return;             // init has not run (nothing to draw yet)
      // stages run on linear time: undo the engine's ease of the whole tween, then ease each stage on its own
      const t = lin(s.fig), tq = 0, S = (x, a, b) => { const u = L.sub(x, a, b); return u * u * (3 - 2 * u); };
      // click 2: the flow dims; the axes; the curve draws
      F.draw({ m: 1, fade: 1 - 0.55 * S(t, 0, 0.25) });
      const ax = S(t, 0.02, 0.18);
      [N.ax, ...N.axLabs].forEach(n => { n.style.opacity = ax; });
      N.curve.setAttribute('stroke-dashoffset', (1 - S(t, 0.1, 0.38)).toFixed(4)); N.curve.style.opacity = t > 0 ? 1 : 0;
      N.curve.setAttribute('stroke-width', (4 + 1.6 * S(lin(s.em), 0.1, 0.9)).toFixed(2));   // click 3: emphasised
      // the ring at rho_t, with its level C(rho_t) (the guide runs to the cost axis)
      const ri = S(t, 0.36, 0.46), lvR = S(t, 0.42, 0.54);
      // the cut sweeps along the axis to (1 - gamma_t) rho_t; the dot rides down the curve; then its level
      const cu = S(t, 0.54, 0.7), lvD = S(t, 0.68, 0.8), dr = S(t, 0.8, 0.94);
      // click 4 (5 in the long deck): the pair slides down the curve (same gamma_t); the busier queue stays as a ghost
      const mv = S(tq, 0.06, 0.72), gh = S(tq, 0, 0.1), ghost = 0.4;
      const rB = RB + (RQ - RB) * mv, rD = KQ * rB;                  // the moving pair's two utilizations
      const xR = X(rB), yR = YC(Cq(rB)), rDot = rB + (rD - rB) * cu, xDt = X(rDot), yDt = YC(Cq(rDot)), yDf = YC(Cq(rD));
      L.at(N.ring, xR, yR); L.op(N.ring, ri);
      L.at(N.dot, xDt, yDt); L.op(N.dot, cu > 0 ? 1 : 0);
      L.setArrow(N.cut, xR, Y0, X(rB + (rD - rB) * cu), Y0); L.op(N.cut, L.sub(cu, 0, 0.12));
      // the construction at the firm's own position (it dims with the ghost at click 4)
      const keep = 1 - (1 - ghost) * gh;
      L.seg(N.vR, X(RB), YC(Cq(RB)), X(RB), Y0); L.op(N.vR, ri * keep);
      L.seg(N.gR, X(RB) - (X(RB) - X0) * lvR, YC(Cq(RB)), X(RB), YC(Cq(RB))); L.op(N.gR, (lvR > 0 ? 1 : 0) * keep);
      L.seg(N.vD, X(RB2), YC(Cq(RB2)), X(RB2), Y0); L.op(N.vD, lvD * keep);
      L.seg(N.gD, X(RB2) - (X(RB2) - X0) * lvD, YC(Cq(RB2)), X(RB2) + (X(RB) - X(RB2)) * lvD, YC(Cq(RB2))); L.op(N.gD, (lvD > 0 ? 1 : 0) * keep);   // both ways from the dot: to the cost axis and to the drop's foot
      [N.tR, N.yR].forEach(n => L.op(n, S(lvR, 0.5, 1) * keep)); [N.xR].forEach(n => L.op(n, ri * keep));
      [N.tD, N.yD, N.xD].forEach(n => L.op(n, S(lvD, 0.5, 1) * keep));
      // the drop v_t grows down from C(rho_t) to C((1 - gamma_t) rho_t), at the pair's rho; the dot's level reaches it
      const yTop = yR, yBot = yR + (yDf - yR) * dr;
      L.seg(N.drop, xR, yTop, xR, yBot); L.op(N.drop, dr > 0 ? 1 : 0);
      L.seg(N.hQ, X(rD), yDf, xR, yDf); L.op(N.hQ, mv > 0.002 ? 1 : 0);
      L.op(N.labV, S(t, 0.86, 1) * (1 - 0.3 * gh));                  // the busier drop's label stays with the drop (0.7)
      // the equation: faint as the figure starts, each piece lights up with its part of the figure
      const e0 = 0.28 * S(t, 0.02, 0.16);
      L.op(N.hd, S(t, 0.02, 0.16));
      L.op(N.eq.a, Math.max(e0, S(t, 0.42, 0.54)));
      L.op(N.eq.mi, Math.max(e0, S(t, 0.68, 0.8))); L.op(N.eq.b, Math.max(e0, S(t, 0.68, 0.8)));
      L.op(N.eq.v, Math.max(e0, S(t, 0.82, 0.96))); L.op(N.eq.eq, Math.max(e0, S(t, 0.82, 0.96)));
    },
    live(k) { return k === 0 && F ? F.live({ m: 1, v: 180, gap: 1.3 }) : null; }   // three requests glide (about 8 s), then all is still
  });
})();
