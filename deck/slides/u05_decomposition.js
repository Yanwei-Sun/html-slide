// Comparison of UBP and PFS.
(function () {
  // colour the profit symbols (the msubsup nodes, in order; null keeps ink)
  function paint(root, L, colors) {
    root.querySelectorAll('mjx-msubsup').forEach((n, i) => { if (colors[i]) n.style.color = L.C[colors[i]]; });
  }

  Deck.slide({
    id: 'U05', section: 'UBP vs. PFS', title: 'Comparison of UBP and PFS', steps: 1,
    html: `
      <style>
        .slide[data-id="U05"] .u05-eq { position: absolute; left: 0; right: 0; top: 342px; display: flex; justify-content: center;
          align-items: baseline; font-size: 68px; white-space: nowrap; }
        .slide[data-id="U05"] .u05-eq .u05-term { display: inline-flex; flex-direction: column; align-items: center; }
        .slide[data-id="U05"] .u05-eq .u05-blab { width: 0; display: flex; flex-direction: column; align-items: center; margin-top: 14px; }
        .slide[data-id="U05"] .u05-eq .u05-name { font-size: 40px; line-height: 1.2; white-space: nowrap; color: var(--ink); }
        .slide[data-id="U05"] .u05-eq .u05-gloss { font-size: 36px; line-height: 1.3; white-space: nowrap; text-align: center;
          color: var(--ink2); margin-top: 16px; }
        .slide[data-id="U05"] .u05-notes { left: 0; right: 0; top: 740px; display: flex; justify-content: center; }
        .slide[data-id="U05"] .u05-list { font-size: 40px; line-height: 1.3; white-space: nowrap; }
        .slide[data-id="U05"] .u05-list > div + div { margin-top: 22px; }
        .slide[data-id="U05"] .u05-bul { color: var(--ink2); margin-right: 0.5em; }
      </style>
      <div class="u05-eq">
        <span>\\(R^{*}_{\\mathrm{PFS}}-R^{*}_{\\mathrm{UBP}}=\\)</span>
        <span class="u05-term" style="margin-left:0.2778em">
          <span>\\(\\underbrace{\\big(R^{\\mathrm{fa}}_{\\mathrm{PFS}}-R^{*}_{\\mathrm{UBP}}\\big)}\\)</span>
          <span class="u05-blab"><span class="u05-name">payment-base gap</span>
            <span class="u05-gloss">pay only for success vs. per use,<br>under full outcome alignment</span></span></span>
        <span style="margin:0 0.2222em">\\(+\\)</span>
        <span class="u05-term" data-dim="1">
          <span>\\(\\underbrace{\\big(R^{*}_{\\mathrm{PFS}}-R^{\\mathrm{fa}}_{\\mathrm{PFS}}\\big)}\\)</span>
          <span class="u05-blab"><span class="u05-name">outcome-misalignment gain</span>
            <span class="u05-gloss">what a tuned metric<br>adds to PFS</span></span></span>
      </div>
      <div class="abs u05-notes"><div class="u05-list">
        <div><span class="u05-bul">•</span>Under <span class="c-orange">UBP</span>, the outcome-alignment rule does not affect profit.</div>
        <div><span class="u05-bul">•</span>Comparison is under <i>optimality</i>.</div></div></div>`,
    after(el, L) {
      // equation: R*_PFS, R*_UBP | R^fa_PFS, R*_UBP | R*_PFS, R^fa_PFS; the under-braces in light grey
      const eq = el.querySelector('.u05-eq');
      paint(eq, L, ['teal', 'orange', 'teal', 'orange', 'teal', 'teal']);
      eq.querySelectorAll('mjx-under').forEach(u => { u.style.color = L.C.ink3; });
    },
    notes: [
  "We split the profit difference into <b>two parts</b>. The payment-base gap compares the formats with <b>accurate reports</b>. The outcome-misalignment gain is what a tuned metric adds.",
  "<b>First</b>, the payment-base gap. With <b>accurate reports</b>, <b>who buys</b> under each format?"
]
  });
})();
