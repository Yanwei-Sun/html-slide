// Research question.
Deck.slide({
  id: 'M10', section: 'Motivation', title: 'Research question', steps: 2,
  notes: [
  "Put these <b>pieces together</b>, and <b>you get</b> our research question: what are the revenue and incentive implications of pricing AI services based on outcomes?",
  "The key challenge is that seller-defined success may not match true success. That's what's new here. In a classic outcome-based contract, the worry is <b>moral hazard</b>, a supplier's hidden effort. Here, the seller runs its own AI, so <b>no effort is hidden</b>. What it controls is how its AI decides what counts as a success. And <b>only</b> the <b>buyer knows</b> what a success is worth to her, and how hard her task is for the AI.",
  "That gives us two questions. First, which <b>earns</b> the seller more: pay for success, or usage-based pricing? Second, what is the optimal mechanism, and how does it resolve the <b>gap</b> between reported and true success? To answer them, we <b>need a model</b>."
],
  html: `
    <style>
      .slide[data-id="M10"] .rq { left: 395px; width: 1130px; top: 175px; padding: 52px 30px 24px; font-size: 48px; line-height: 1.35; text-align: center; }
      .slide[data-id="M10"] .q { position: absolute; left: 210px; display: grid; grid-template-columns: 90px auto; align-items: baseline; }
      .slide[data-id="M10"] .q .n { font-size: 44px; line-height: 1.3; font-weight: 700; color: var(--gold); }   /* list number: headline size, on the headline baseline */
      .slide[data-id="M10"] .q .m { font-size: 44px; line-height: 1.3; white-space: nowrap; }
      .slide[data-id="M10"] .q .s { font-size: 36px; line-height: 1.4; color: var(--ink2); margin-top: 12px; white-space: nowrap; }
    </style>
    <div class="card rq">What are the revenue and incentive implications<br>of pricing AI services based on outcomes?</div>
    <div class="abs body" style="left:300px;top:455px;font-size:44px;white-space:nowrap" data-in="1" data-dim="2"><b>Key challenge:</b> seller-defined <span class="c-purple">success</span> may not match true success.</div>
    <div class="abs small c-ink2" style="left:300px;top:580px;font-size:36px" data-in="2">Two concrete questions</div>
    <div class="q" style="top:662px" data-in="2"><span class="n">1</span><div>
      <div class="m"><span class="c-teal">Pay-for-success</span> vs. <span class="c-orange">usage-based pricing</span>?</div></div></div>
    <div class="q" style="top:817px" data-in="2"><span class="n">2</span><div>
      <div class="m">What is the optimal mechanism?</div>
      <div class="s">How can the <span class="c-purple">outcome-alignment</span> problem be resolved?</div></div></div>`
});
