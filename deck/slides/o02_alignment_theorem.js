// No need to distort the success metric!.
(function () {
  const T = { line: 462, list: 586 };    // tops
  const LAG = 260;                       // the bullets follow the line (ms)

  Deck.slide({
    id: 'O02', section: 'Optimal mechanism', title: 'No need to distort the success metric!', steps: 1,
    notes: [
  "The answer: with no restriction on the contract, full outcome alignment is optimal. The seller never needs the <b>power we gave it</b>, and the buyer can take the AI's report at <b>face value</b>.",
  "Think of the two prices as a fee per use plus a success bonus. The fee per use lets the seller charge for <b>every attempt</b>, so it never needs to <b>call</b> a failure a success to get paid. And the success bonus ties payment to performance."
],
    html: `
      <style>
        .slide[data-id="O02"] .result { left: 0; right: 0; top: 172px; width: fit-content; margin: 0 auto;
          padding: 30px 45px 4px 48px; }
        .slide[data-id="O02"] .o2-head { font-size: 42px; line-height: 1.3; }
        .slide[data-id="O02"] .o2-st { font-size: 46px; line-height: 1.45; margin-top: 6px; white-space: nowrap; }
        .slide[data-id="O02"] .o2-line { left: 0; right: 0; top: ${T.line}px; text-align: center; font-size: 48px;
          line-height: 1.3; white-space: nowrap; }
        .slide[data-id="O02"] .o2-list { left: 0; right: 0; top: ${T.list}px; width: fit-content; margin: 0 auto; }
        .slide[data-id="O02"] .o2-b { position: relative; padding-left: 46px; font-size: 38px; line-height: 1.3;
          white-space: nowrap; color: var(--ink2); }
        .slide[data-id="O02"] .o2-b + .o2-b { margin-top: 24px; }
        .slide[data-id="O02"] .o2-b::before { content: '•'; position: absolute; left: 8px; color: var(--ink3); }
      </style>
      <div class="result" data-in="0">
        <div class="o2-head"><span class="kind">Theorem</span></div>
        <div class="o2-st">In the unrestricted contract space, <b>full outcome alignment is optimal</b>.</div>
      </div>
      <div class="abs o2-line" data-in="1">Two prices \\(=\\) a <b class="c-orange">fee per use</b> \\(+\\) a <b class="c-teal">success bonus</b></div>
      <div class="abs o2-list">
        <div class="o2-b" data-in="1" style="transition-delay:${LAG}ms">the fee per use covers the AI’s cost, even on hard tasks</div>
        <div class="o2-b" data-in="1" style="transition-delay:${2 * LAG}ms">the <span class="c-teal">success bonus</span> ties payment to performance</div>
      </div>`
  });
})();
