// Companies are moving to pay for success.
(function () {
  const CW = 810, CH = 530, CY = 168, CX = [120, 990];          // two cards: together they span the 120..1800 band
  const DX = (1920 - CW) / 2 - CX[0];                           

  const flag = i => (i === 0 ? 'data-in="0" data-z="1"' : 'data-o="1"');
  

  const PHOTO = ['greg_brockman_2019.jpg', 960, 1194, 480, 455, 880];
  const PD = 450, PX = 150, QX = PHOTO ? PX + PD + 76 : 120;     
  const QT = 314;                                                
  const PT = QT - 105;                                           
  const PK = PHOTO ? PD / PHOTO[5] : 1;                         // the photo's scale in its circle
  const IW = 720, IB = CY + 146;                                // screenshot width; vertical centre of the image band
  // [file, natural width, natural height, crop x, y, w, h]; null: no screenshot (a line icon instead)
  const SHOTS = [
    null,
    ['openai_outcome_pricing_report_20260909.png', 1830, 1588, 60, 0, 1763, 535]
  ];
  // a cropped screenshot: an SVG whose viewBox is the crop, so nothing spills outside its frame
  function shot(i) {
    if (!SHOTS[i]) return '';
    const [f, nw, nh, x, y, w, h] = SHOTS[i], H = Math.round(h * IW / w);
    return `<div class="shot m04-crop" style="left:${CX[i] + (CW - IW) / 2}px;top:${IB - H / 2}px;width:${IW}px;height:${H}px" ${flag(i)}>
      <svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice"><image href="assets/${f}" width="${nw}" height="${nh}"/></svg></div>`;
  }
  const card = (i, name, fact, src) => `
      <div class="m04-card" style="left:${CX[i]}px" ${flag(i)}></div>
      ${shot(i)}
      <div class="abs m04-name" style="left:${CX[i]}px;top:${CY + 300}px" ${flag(i)}>${name}</div>
      <div class="abs m04-fact" style="left:${CX[i] + 20}px;top:${CY + 362}px" ${flag(i)}>${fact}</div>
      <div class="abs m04-src" style="left:${CX[i] + 30}px;top:${CY + CH - 94}px" ${flag(i)}><span>${src}</span></div>`;

  const real = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);   // undo the engine's easing
  const sm = x => x * x * (3 - 2 * x);
  let cardsEl, iconG, quoteEl, photoEl, textEl, zEls, oEls;

  Deck.slide({
    id: 'M04', section: 'Motivation', title: 'Companies are moving to pay for success', steps: 1,
    notes: [
  "And many AI companies are moving to the <b>second answer</b>. Zendesk, for example, sells AI agents for customer service, and <b>charges only</b> for the requests its agent resolves.",
  "<b>Even</b> OpenAI is reportedly testing pay on completion with some large customers. The idea is <b>simple</b>: payment is tied to business value."
],
    html: `
      <style>
        .slide[data-id="M04"] .m04-cards { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; pointer-events: none; }
        .slide[data-id="M04"] .m04-cards a { pointer-events: auto; }    
        .slide[data-id="M04"] .m04-card { position: absolute; top: ${CY}px; width: ${CW}px; height: ${CH}px; background: var(--wash); border-radius: 12px; z-index: 0; }
        .slide[data-id="M04"] .m04-crop { overflow: hidden; }
        .slide[data-id="M04"] .m04-crop svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
        .slide[data-id="M04"] .m04-name { width: ${CW}px; text-align: center; font-size: 44px; line-height: 1.2; }
        .slide[data-id="M04"] .m04-fact { width: ${CW - 40}px; text-align: center; font-size: 40px; line-height: 1.3; color: var(--ink2); white-space: nowrap; }
        .slide[data-id="M04"] .m04-src { width: ${CW - 60}px; height: 60px; display: flex; align-items: flex-end; justify-content: center;
          text-align: center; font-size: 22px; line-height: 1.3; color: var(--ink3); }
        .slide[data-id="M04"] .m04-q { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; pointer-events: none; }    
        .slide[data-id="M04"] .m04-photo { position: absolute; left: ${PX}px; top: ${PT}px; width: ${PD}px; height: ${PD}px; border-radius: 50%; overflow: hidden;
          box-shadow: 0 0 0 5px var(--paper), 0 0 0 7.5px var(--rule); transform-origin: 50% 50%; }
        .slide[data-id="M04"] .m04-photo img { position: absolute; max-width: none;
          ${PHOTO ? `left: ${(PD / 2 - PHOTO[3] * PK).toFixed(1)}px; top: ${(PD / 2 - PHOTO[4] * PK).toFixed(1)}px; width: ${(PHOTO[1] * PK).toFixed(1)}px; height: ${(PHOTO[2] * PK).toFixed(1)}px;` : ''} }
        .slide[data-id="M04"] .m04-qt { position: absolute; left: ${QX}px; right: 120px; top: ${QT - 10}px; ${PHOTO ? '' : 'text-align: center;'} }
        .slide[data-id="M04"] .m04-quote { font-size: 60px; line-height: 1.3; font-style: italic; white-space: nowrap; }
        .slide[data-id="M04"] .m04-who { margin-top: 34px; font-size: 46px; line-height: 1.2; }
        .slide[data-id="M04"] .m04-title { margin-top: 6px; font-size: 40px; line-height: 1.25; color: var(--ink2); }
        .slide[data-id="M04"] .m04-when { margin-top: 14px; font-size: 32px; line-height: 1.3; color: var(--ink3); }
        .slide[data-id="M04"] .m04-foot { font-size: 14px; }
      </style>
      <div class="m04-cards">
      ${card(0, 'Zendesk AI agents', 'paid per <span class="c-teal">automated resolution</span>', '<a href="https://support.zendesk.com/hc/en-us/articles/9570369117338-About-automated-resolution-tiers" target="_blank" rel="noopener">Zendesk Help Center, “About automated resolution tiers”</a>')}
      ${card(1, 'OpenAI', 'testing: pay on <span class="c-teal">completion</span>', '<a href="https://superpowerdaily.com/posts/openai-reportedly-lets-large-customers-pay-only-for-completed-ai-tasks-raising-a-proof-test" target="_blank" rel="noopener">Superpower Daily, updated 3 Sep. 2026</a>;<br><a href="https://ig.ft.com/ai-tokens/" target="_blank" rel="noopener">Financial Times, 2 Oct. 2026</a>')}
      <div class="abs" style="left:0;right:0;top:${CY + CH + 112}px;font-size:60px;line-height:1.2;text-align:center;white-space:nowrap" ${flag(1)}>Payment is tied to <span class="c-teal">business value</span>!</div>
      </div>
      <div class="m04-q" style="opacity:0">
        ${PHOTO ? `<div class="m04-photo"><img src="assets/${PHOTO[0]}" alt="Greg Brockman"></div>` : ''}
        <div class="m04-qt">
          <div class="m04-quote">“Pricing in <span class="c-orange">tokens</span> doesn’t make any sense.<br>Price per <span class="c-teal">task</span> is what matters.”</div>
          <div class="m04-who">Greg Brockman</div>
          <div class="m04-title">President of OpenAI</div>
          <div class="m04-when">at the launch of OpenAI’s Astra model, Sept. 2026</div>
        </div>
      </div>
      <div class="source m04-foot" data-in="2">Quote: <a href="https://ig.ft.com/ai-tokens/" target="_blank" rel="noopener">Financial Times, 2 Oct. 2026</a>.${PHOTO ? ' Photo: <a href="https://commons.wikimedia.org/wiki/File:Disrupt_SF_TechCrunch_Disrupt_San_Francisco_2019_-_Day_2_(48838200316)_(cropped).jpg" target="_blank" rel="noopener">TechCrunch (Steve Jennings / Getty Images for TechCrunch)</a>, <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener">CC BY 2.0</a>, via <a href="https://commons.wikimedia.org/wiki/File:Disrupt_SF_TechCrunch_Disrupt_San_Francisco_2019_-_Day_2_(48838200316)_(cropped).jpg" target="_blank" rel="noopener">Wikimedia Commons</a>.' : ''}</div>`,
    init(el, L) {
      // Zendesk: a resolved conversation (chat bubble with a check), drawn in the deck's line style (strokes about
      // 5.5 px, as the other icons); the bubble's drawn extent is centred on the image band, about as tall as the screenshot
      const svg = L.svg(el), x = CX[0] + CW / 2, S = 300;
      iconG = L.g(svg);                                            // faded with the cards at click 2 (draw)
      const g = L.g(iconG, { 'data-in': 0 });
      L.icon(g, 'chat', x, IB - 6, S, { color: 'ink2', w: 1.85 });
      L.icon(g, 'check', x, IB - 6 - 0.081 * S, 0.3875 * S, { color: 'teal', w: 3.5 });
      cardsEl = el.querySelector('.m04-cards'); quoteEl = el.querySelector('.m04-q');
      photoEl = el.querySelector('.m04-photo'); textEl = el.querySelector('.m04-qt');
      zEls = [...el.querySelectorAll('[data-z]')]; oEls = [...el.querySelectorAll('[data-o]')];
    },
    

    state: k => ({ q: k >= 2 ? 1 : 0, z: k >= 1 ? 1 : 0 }),
    dur: k => (k === 2 ? 1400 : k === 1 ? 1100 : 900),
    draw(el, s, L) {
      if (!cardsEl) return;
      const dx = (DX * (1 - s.z)).toFixed(1), o = sm(L.sub(s.z, 0.75, 1)).toFixed(3);   // OpenAI's card waits until the gap is nearly clear
      zEls.forEach(n => { n.style.transform = `translateX(${dx}px)`; });
      iconG.setAttribute('transform', `translate(${dx},0)`);
      oEls.forEach(n => { n.style.opacity = o; });
      const e = real(s.q), out = 1 - sm(L.sub(e, 0, 0.4));
      const pin = sm(L.sub(e, 0.44, 0.82)), tin = sm(L.sub(e, 0.56, 1));     // the photo first, then the words
      cardsEl.style.opacity = out.toFixed(3); iconG.style.opacity = out.toFixed(3);
      quoteEl.style.opacity = e > 0.44 ? 1 : 0;
      if (photoEl) { photoEl.style.opacity = pin.toFixed(3); photoEl.style.transform = `scale(${(0.94 + 0.06 * pin).toFixed(4)})`; }
      textEl.style.opacity = tin.toFixed(3); textEl.style.transform = `translateY(${(14 * (1 - tin)).toFixed(1)}px)`;
    }
  });
})();
