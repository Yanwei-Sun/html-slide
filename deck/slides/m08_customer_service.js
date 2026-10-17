// Example: customer service.
(function () {
  

  const NOAI = { D: 240, Y: 485, c: 316, q: 1222, s: 1603 };
  const AI = { D: 180, Y: 496, c: 210, a: 498, d: 838, q: 1409, s: 1682, done: [1138, 296] };    
  const PRICE = AI;
  const unease = e => (e <= 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);   // the engine's ease undone: clock time
  const smooth = x => x * x * (3 - 2 * x);
  let F = null, band = null;
  

  const QD = 0.88 * NOAI.D, QP = 0.78 * QD, GAP = 13, X0 = NOAI.c + NOAI.D / 2 + GAP;
  const backX = n => NOAI.q - (n - 1) * QP - QD / 2 - GAP;      // where the long arrow ends, n people in line
  const V = 380, TFADE = 0.3, PFADE = 0.55;                     

  const JOIN = [{ go: 1.2, i: 2 }, { go: 3.2, i: 3 }].map((J, j) => {
    const x1 = backX(2 + j) - 14.4;                             // the request stops at the arrowhead (lib.js: head = 0.08 x the AI layout's D)
    return Object.assign(J, { x1, at: J.go + (x1 - X0) / V });
  });
  const TG = JOIN[1].at + PFADE;                                // the build's length (s)
  let grow = null;                                              // seconds into the build (null: the line is built)
  // the csflow's thin arrow (lib.js setArrow), straight and horizontal
  function hArrow(A, x1, x2, y) {
    const h = Math.min(A.h, x2 - x1), hw = 0.4 * h, bx = x2 - h, f = v => v.toFixed(1);
    A.shaft.setAttribute('d', `M${f(x1)},${f(y)}L${f(x2 - 0.62 * h)},${f(y)}`);
    A.head.setAttribute('d', `M${f(x2)},${f(y)}L${f(bx)},${f(y + hw)}L${f(x2 - 0.72 * h)},${f(y)}L${f(bx)},${f(y - hw)}Z`);
  }
  

  function line(t, L) {
    const N = F.N;
    JOIN.forEach(J => { const A = N.queue[J.i].g; A.style.opacity = ''; A.removeAttribute('transform'); });
    if (t === null) return;
    let n = 2, xEnd = backX(2);
    JOIN.forEach((J, j) => {
      const p = smooth(L.sub(t, J.at - 0.1, J.at - 0.1 + PFADE)), A = N.queue[J.i].g, dx = -28 * (1 - p);
      A.style.opacity = p.toFixed(3); A.setAttribute('transform', `translate(${dx.toFixed(1)},0)`);   // steps in from behind
      n += p;
      // the arrow draws back to the new person's edge as they appear, and stays clear of them as they step in
      if (t > J.at - 0.1) xEnd = L.mix(backX(2 + j), backX(3 + j) + dx, smooth(L.sub(t, J.at - 0.1, J.at + 0.25)));
      const tk = N.tok[j], u = (t - J.go) * V;
      if (t < J.go || t > J.at + TFADE) return;
      const op = Math.min(smooth(L.clamp((t - J.go) / TFADE)), smooth(L.clamp((J.at + TFADE - t) / TFADE)));
      tk.g.setAttribute('transform', `translate(${Math.min(X0 + u, J.x1).toFixed(1)},${NOAI.Y}) scale(1)`);
      tk.g.setAttribute('opacity', op.toFixed(3));
      tk.b.setAttribute('stroke', L.C.ink2); tk.dots.forEach(d => d.setAttribute('fill', L.C.ink2));
    });
    hArrow(N.aLong, X0, xEnd, NOAI.Y);
    if (N.lab.queue) N.lab.queue.style.left = (NOAI.q - (n - 1) * QP / 2).toFixed(1) + 'px';
  }
  function paint(s, L) {
    // click 2: the highlight comes up as the rest dims (z: the pricing layout, here click 1's), then the columns
    const t2 = unease(s.z), z = smooth(L.sub(t2, 0, 0.5)), h = smooth(L.sub(t2, 0.3, 0.75));
    F.draw({ m: unease(s.m), z, hi: h, dim: h });
    line(s.m === 0 && s.z === 0 ? grow : null, L);               
    const b = smooth(L.sub(t2, 0.55, 1));
    band.forEach(n => { n.style.opacity = b; });
  }

  Deck.slide({
    id: 'M08', section: 'Motivation', title: 'Example: customer service', steps: 2,
    notes: [
  "Picture a firm that serves its own customers. That firm is our AI buyer. Without AI, every request goes to the firm's human staff. Their <b>capacity</b> is <b>limited</b>, so customers may <b>wait</b> in a queue.",
  "Now the firm buys an AI agent from an AI company, our AI <b>seller</b>. The agent resolves some requests right away and escalates the rest, so <b>fewer</b> customers <b>wait</b> in <b>line</b>.",
  "How should the AI company price this agent? <b>Sellers answer differently</b>: <b>some</b> use usage-based pricing, <b>others</b> pay for success."
],
    html: `
      <style>
        .slide[data-id="M08"] .phase { left: 122px; top: 160px; width: 600px; font-size: 48px; line-height: 1.2; font-weight: 700; }
        .slide[data-id="M08"] .m8-cap { left: 120px; right: 120px; top: 868px; font-size: 44px; line-height: 1.25; }
        .slide[data-id="M08"] .fmt { position: absolute; top: 776px; width: 800px; text-align: center; }
        .slide[data-id="M08"] .fmt .nm { font-size: 44px; line-height: 1.2; }
        .slide[data-id="M08"] .fmt .ds { font-size: 40px; line-height: 1.25; margin-top: 4px; }
        .slide[data-id="M08"] .fmt .eg { font-size: 36px; line-height: 1.25; color: var(--ink2); margin-top: 4px; }
        .slide[data-id="M08"] .m8-band { transition: none; }   /* draw() fades it in once the highlight is up */
      </style>
      <div class="abs phase" data-out="1">Without AI agents</div>
      <div class="abs phase" data-in="1" data-dim="2">With AI agents</div>
      <div class="abs center m8-cap" data-out="1">The <b>AI buyer</b> is a <b>firm</b> serving its own customers.</div>
      <div class="abs center m8-cap" data-in="1" data-out="2">AI agents reduce <b>congestion</b> in the queue.</div>
      <div class="fmt m8-band" style="left:120px" data-in="2">
        <div class="nm c-orange">usage-based pricing</div>
        <div class="ds">the same price per customer request</div>
        <div class="eg">e.g., Agentforce, Tidio Lyro</div></div>
      <div class="fmt m8-band" style="left:1000px" data-in="2">
        <div class="nm c-teal">pay-for-success</div>
        <div class="ds">pay only for resolved requests</div>
        <div class="eg">e.g., Fin, Zendesk AI agents</div></div>
      <div class="source m8-band" data-in="2">Examples: <a href="https://www.salesforce.com/agentforce/pricing/" target="_blank" rel="noopener">Agentforce</a>, <a href="https://www.tidio.com/pricing/" target="_blank" rel="noopener">Tidio Lyro</a> and <a href="https://fin.ai/pricing" target="_blank" rel="noopener">Fin</a> pricing pages; <a href="https://support.zendesk.com/hc/en-us/articles/9570369117338-About-automated-resolution-tiers" target="_blank" rel="noopener">Zendesk Help Center</a>.</div>`,
    init(el, L) {
      F = L.csflow(el, { font: 40, X: { noai: NOAI, ai: AI, price: PRICE }, queue: [4, 2], staff: 1,
                         price: { label: 'How to price the AI service?', font: 44 } });
      band = el.querySelectorAll('.m8-band');
    },
    state: k => ({ m: k >= 1 ? 1 : 0, z: k >= 2 ? 1 : 0 }),
    dur: k => 0,    
    draw(el, s, L) { if (F) paint(s, L); },
    

    live() { return null; }    
  });
})();
