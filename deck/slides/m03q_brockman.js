// OpenAI on token pricing.
(function () {
  // [file, natural w, natural h, crop centre x, y, crop side] (image px): the face, centred, with the head clear of the rim
  const PHOTO = ['greg_brockman_2019.jpg', 960, 1194, 480, 455, 880];
  const PD = 450, PX = 150, QX = PX + PD + 76, QT = 280, PT = QT - 105, PK = PD / PHOTO[5];

  Deck.slide({
    id: 'M03Q', section: 'Motivation', title: 'OpenAI on token pricing', steps: 1,
    notes: [
  "Today, most commercial AI is priced by tokens: you pay for every token the AI <b>reads</b> and <b>writes</b>. But tokens measure <b>attempts</b>, <b>not results</b>. This is Greg Brockman, the president of OpenAI. At the launch of its Astra model in September 2026, he said: “Pricing in tokens doesn't make any sense. Price per task is what matters.”",
  "But what exactly does “price per task” mean? Every task the AI handles, <b>whatever</b> the <b>outcome</b>? That's usage-based pricing. Or <b>only</b> the tasks it completes? That's pay for success."
],
    html: `
      <style>
        .slide[data-id="M03Q"] .bq-photo { position: absolute; left: ${PX}px; top: ${PT}px; width: ${PD}px; height: ${PD}px; border-radius: 50%; overflow: hidden;
          box-shadow: 0 0 0 5px var(--paper), 0 0 0 7.5px var(--rule); }
        .slide[data-id="M03Q"] .bq-photo img { position: absolute; max-width: none;
          left: ${(PD / 2 - PHOTO[3] * PK).toFixed(1)}px; top: ${(PD / 2 - PHOTO[4] * PK).toFixed(1)}px; width: ${(PHOTO[1] * PK).toFixed(1)}px; height: ${(PHOTO[2] * PK).toFixed(1)}px; }
        .slide[data-id="M03Q"] .bq-qt { position: absolute; left: ${QX}px; right: 120px; top: ${QT - 10}px; }
        .slide[data-id="M03Q"] .bq-quote { font-size: 60px; line-height: 1.3; font-style: italic; white-space: nowrap; }
        .slide[data-id="M03Q"] .bq-who { margin-top: 34px; font-size: 46px; line-height: 1.2; }
        .slide[data-id="M03Q"] .bq-title { margin-top: 6px; font-size: 40px; line-height: 1.25; color: var(--ink2); }
        .slide[data-id="M03Q"] .bq-when { margin-top: 14px; font-size: 32px; line-height: 1.3; color: var(--ink3); }
        .slide[data-id="M03Q"] .bq-foot { font-size: 14px; }
        .slide[data-id="M03Q"] .bq-ask { left: 0; right: 0; top: ${PT + PD + 70}px; text-align: center; font-size: 56px; line-height: 1.2; }    
        .slide[data-id="M03Q"] .bq-ask2 { margin-top: 26px; font-size: 44px; line-height: 1.25; color: var(--ink2); }    
         
        .slide[data-id="M03Q"] .bq-opt { position: relative; display: inline-block; }
        .slide[data-id="M03Q"] .bq-name { position: absolute; left: 50%; top: 100%; margin-top: 18px; transform: translateX(-50%);
          font-size: 36px; line-height: 1.2; white-space: nowrap; }
      </style>
      <div class="bq-photo"><img src="assets/${PHOTO[0]}" alt="Greg Brockman"></div>
      <div class="bq-qt">
        <div class="bq-quote">“Pricing in <span class="c-orange">tokens</span> doesn’t make any sense.<br>Price per <span class="c-teal">task</span> is what matters.”</div>
        <div class="bq-who">Greg Brockman</div>
        <div class="bq-title">President of OpenAI</div>
        <div class="bq-when">at the launch of OpenAI’s Astra model, Sept. 2026</div>
      </div>
      <div class="abs bq-ask" data-in="1">What exactly does “price per task” mean?
        <div class="bq-ask2"><span class="bq-opt">Every task the AI <span class="c-orange">handles</span>?<span class="bq-name c-orange">usage-based pricing</span></span> <span class="bq-opt">Or every task it <span class="c-teal">completes</span>?<span class="bq-name c-teal">pay for success</span></span></div></div>
      <div class="source bq-foot">Quote: <a href="https://ig.ft.com/ai-tokens/" target="_blank" rel="noopener">Financial Times, 2 Oct. 2026</a>. Photo: <a href="https://commons.wikimedia.org/wiki/File:Disrupt_SF_TechCrunch_Disrupt_San_Francisco_2019_-_Day_2_(48838200316)_(cropped).jpg" target="_blank" rel="noopener">TechCrunch (Steve Jennings / Getty Images for TechCrunch)</a>, <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener">CC BY 2.0</a>, via <a href="https://commons.wikimedia.org/wiki/File:Disrupt_SF_TechCrunch_Disrupt_San_Francisco_2019_-_Day_2_(48838200316)_(cropped).jpg" target="_blank" rel="noopener">Wikimedia Commons</a>.</div>`
  });
})();
