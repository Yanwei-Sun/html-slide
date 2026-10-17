// The seller's problem.
Deck.slide({
  id: 'D05', section: 'Model', title: "The seller's problem", steps: 2,
  notes: [
  "The seller maximizes <b>expected profit</b>: the payments it collects, minus its verification costs and the cost of <b>running</b> the <b>AI</b>.",
  "There are <b>three constraints</b>. Sequential rationality: after each report, the buyer pays or disputes, <b>whichever is better</b> for her.",
  "Incentive compatibility: each buyer prefers the item <b>meant for her</b>. And individual rationality: she's at least as well off buying as <b>walking away</b>. Now, to the results."
],
  html: `
    <style>
      .slide[data-id="D05"] .obj { font-size: 60px; }
      .slide[data-id="D05"] .cons { display: grid; grid-template-columns: max-content max-content; justify-content: center; column-gap: 28px; row-gap: 40px; align-items: center; font-size: 44px; line-height: 1.4; }
      .slide[data-id="D05"] .cons > div { white-space: nowrap; }
      .slide[data-id="D05"] .cons .st { font-size: 36px; color: var(--ink2); margin-bottom: -14px; }
      .slide[data-id="D05"] .cons .tag { color: var(--ink2); font-size: 36px; line-height: 1.12; font-weight: 700; text-align: right; white-space: nowrap; }
    </style>
    <div class="abs center obj" style="left:0;right:0;top:200px">\\(\\displaystyle\\max_{\\mathcal M}\\ \\sum_{t}\\pi_t\\,\\Big[\\,\\mathbb E\\big[\\mathrm{payment}_t\\big]-\\kappa_S\\Pr(\\mathrm{dispute}_t)-c(a_t)\\,\\Big]\\)</div>
    <div class="abs cons" style="left:120px;right:120px;top:500px">
      <div class="st" style="grid-column:2" data-in="1">subject to</div>
      <div class="tag" data-in="1">[Sequential<br>rationality]</div><div data-in="1">the buyer pays or disputes <em>optimally</em> after seeing the AI-reported outcome</div>
      <div class="tag" data-in="2">[Incentive<br>compatibility]</div><div data-in="2">each type picks its own item</div>
      <div class="tag" data-in="2">[Individual<br>rationality]</div><div data-in="2">each type gets non-negative expected utility</div>
    </div>`
});
