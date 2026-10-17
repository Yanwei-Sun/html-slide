// Buyer success ≠ AI success.
(function () {
  const XL = 387, XR = 1429;                   // the two columns: true outcome, AI-reported outcome
  const XM = (XL + XR) / 2;                    // the rule's column, midway (the right labels are wider than the left)
  const ROW0 = { icon: 466, size: 140, name: 594, sym: 670 };   // click 0: the two records, centred
  const ROW1 = { icon: 222, size: 96, name: 320, sym: 392 };    // click 1: lifted to column heads
  const NEQ = 88, MAY = 180;                                     // the "neq" and "may differ", below the icon row
  // click 1's figure: the math axes of omega = 1 and omega = 0 (left) and of omega-hat = 1 (right, midway)
  const YT = 548, YB = 800, YM = (YT + YB) / 2;    
  const FM = 46, FW = 34;    
  const WD = 58;    
  const G1 = 28, G2 = 26, TIP = 18;            // arrows: gap after omega, gap before omega-hat, tips above / below its axis
  const AW = 6, AH = 32;                       

  const SD = [54, 62];
  const inv = e => (e <= 0 ? 0 : e >= 1 ? 1 : e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2);   // undo the engine's ease
  let icons, seller, names, syms, neq, may, head, fml, outs, words, sigs, arrows, defs;
  // arrow ends [x1, y1, x2, y2], tail to tip (provisional; after() measures them on the typeset math)
  let ends = [[XL + 100, YT, XR - 120, YM - TIP], [XL + 100, YB, XR - 120, YM + TIP]];

  function iconAt(g, x, y, size) { g.setAttribute('transform', `translate(${x - size / 2},${y - size / 2}) scale(${size / 100})`); }

  Deck.slide({
    id: 'D03', section: 'Model', title: 'Buyer success ≠ AI success', steps: 1,
    notes: [
  "Each task now has a true outcome, by <b>her own standard</b>, and an AI-reported outcome, which is <b>what she pays on</b>. The two may differ.",
  "The seller designs the outcome-alignment rule: how often a true success is reported as a success, and how often a true failure is. When the report always matches the truth, we call it full outcome alignment. The seller may choose <b>any</b> rule, even one that calls failures successes. We give it <b>a lot of power</b>, and later we'll show it <b>never needs it</b>. It <b>commits</b> to the rule up front, so the buyer knows it."
],
    init(el, L) {
      const svg = L.svg(el);
      icons = [L.icon(svg, 'person-o', XL, ROW0.icon, ROW0.size), L.icon(svg, 'robot', XR, ROW0.icon, ROW0.size)];
      seller = L.icon(svg, 'server', XM, ROW1.icon, ROW1.size);
      // labels 36 px (the .lab default), math 44 px
      names = [L.label(el, XL, ROW0.name, 'true outcome', { anchor: 'c', color: 'ink2' }),
               L.label(el, XR, ROW0.name, 'AI-reported outcome', { anchor: 'c', color: 'ink2' })];
      const M44 = 'font-size:44px';
      syms = [L.label(el, XL, ROW0.sym, '\\(\\omega\\in\\{0,1\\}\\)', { anchor: 'c', style: M44 }),
              L.label(el, XR, ROW0.sym, '<span class="c-purple">\\(\\widehat\\omega\\)</span>\\({}\\in\\{0,1\\}\\)', { anchor: 'c', style: M44 })];
      neq = L.label(el, XM, ROW0.icon + NEQ, '\\(\\neq\\)', { anchor: 'c', style: 'font-size:100px', color: 'ink2' });
      may = L.label(el, XM, ROW0.icon + MAY, 'may differ', { anchor: 'c', color: 'ink2' });
      head = L.label(el, XM, ROW1.name, 'outcome-alignment rule', { anchor: 'c', color: 'ink2' });
      fml = L.label(el, XM, ROW1.sym, '<span class="c-purple">\\(\\sigma_r^j\\)</span>\\({}=\\Pr(\\)<span class="c-purple">\\(\\widehat\\omega\\)</span>\\({}=1\\mid\\omega=j)\\)', { anchor: 'c', style: M44 });
      // the figure: outcomes 52 px, their words 38 px, sigmas 52 px (placed in after(), on the typeset math)
      const FMs = `font-size:${FM}px`, FWs = `font-size:${FW}px`;
      outs = [L.label(el, XL, YT, '\\(\\omega=1\\)', { anchor: 'l', color: 'green', style: FMs }),
              L.label(el, XL, YB, '\\(\\omega=0\\)', { anchor: 'l', color: 'red', style: FMs }),
              L.label(el, XR, YM, '\\(\\widehat\\omega=1\\)', { anchor: 'l', color: 'purple', style: FMs })];
      words = [L.label(el, XL, YT + WD, 'true success', { anchor: 'l', color: 'green', style: FWs }),
               L.label(el, XL, YB + WD, 'true failure', { anchor: 'l', color: 'red', style: FWs }),
               L.label(el, XR, YM + WD, 'reported success', { anchor: 'l', color: 'purple', style: FWs })];
      sigs = [L.label(el, XM, YT, '\\(\\sigma_r^1\\)', { anchor: 'c', color: 'purple', style: FMs }),
              L.label(el, XM, YB, '\\(\\sigma_r^0\\)', { anchor: 'c', color: 'purple', style: FMs })];
      arrows = ends.map(e => L.arrow(svg, e[0], e[1], e[0], e[1], { color: 'purple', w: AW, head: AH }));
       
      defs = [L.label(el, 960, YB + 158, '<span class="kind">Definition</span> Full outcome alignment: <span class="c-purple">\\(\\sigma_r^1=1\\)</span> and <span class="c-purple">\\(\\sigma_r^0=0\\)</span>', { anchor: 'c', cls: 'result d03-def' })];
    },
    after(el, L) {                                  // line the figure up on the typeset math
      const was = el.style.display; el.style.display = 'block';
      const R0 = el.getBoundingClientRect(), sc = R0.width / 1920;
      const box = n => { const q = (n.querySelector('mjx-math') || n).getBoundingClientRect(); return { l: (q.left - R0.left) / sc, r: (q.right - R0.left) / sc }; };
      // the math axis: the middle of the box of '=' (TeX's = is .583 high, .082 deep: its middle is the axis)
      const axis = n => { const q = n.querySelector('mjx-c.mjx-c3D').getBoundingClientRect(); return ((q.top + q.bottom) / 2 - R0.top) / sc; };
      // each outcome starts under its header symbol (omega, omega-hat), its words aligned with it; its axis at its row
      const xa = box(syms[0]).l, xb = box(syms[1]).l;
      [[xa, YT], [xa, YB], [xb, YM]].forEach(([x, y], i) => {
        L.place(outs[i], x, y); L.place(outs[i], x, 2 * y - axis(outs[i]));
        L.place(words[i], x, y + WD);
      });
      const xc = box(outs[2]).l;
      ends = [[box(outs[0]).r + G1, YT, xc - G2, YM - TIP], [box(outs[1]).r + G1, YB, xc - G2, YM + TIP]];
      // the sigmas, in the rule's column: SD px off their arrows, measured square to the arrow
      ends.forEach(([x1, y1, x2, y2], i) => {
        const y = y1 + ((XM - x1) / (x2 - x1)) * (y2 - y1), dy = SD[i] * Math.hypot(x2 - x1, y2 - y1) / (x2 - x1);
        L.place(sigs[i], XM, i ? y + dy : y - dy);
      });
      el.style.display = was;
    },
    state: k => ({ p: k === 0 ? 0 : 1 }),
    dur: k => (k === 1 ? 500 : 0),    
    draw(el, s, L) {
      const t = inv(L.clamp(s.p)), E = Deck.ease, st = (a, b) => E(L.sub(t, a, b));
      // one click: the heads lift, the rule fades in, then the outcomes fade in, the arrows draw on, and the sigmas follow
      const mv = st(0, 0.36), gone = st(0, 0.20), rule = st(0.30, 0.50), node = st(0.46, 0.62), grow = st(0.58, 0.90), sig = st(0.82, 1);
      const R = k => L.mix(ROW0[k], ROW1[k], mv);
      iconAt(icons[0], XL, R('icon'), R('size')); iconAt(icons[1], XR, R('icon'), R('size'));
      names.forEach((n, i) => L.place(n, i ? XR : XL, R('name')));
      syms.forEach((n, i) => L.place(n, i ? XR : XL, R('sym')));
      const dy = R('icon') - ROW0.icon;
      L.place(neq, XM, ROW0.icon + NEQ + dy); L.op(neq, 1 - gone);
      L.place(may, XM, ROW0.icon + MAY + dy); L.op(may, 1 - gone);
      L.op(seller, rule); L.op(head, rule); L.op(fml, rule);
      outs.concat(words).forEach(n => L.op(n, node));
      defs.forEach(n => L.op(n, sig));    
      arrows.forEach((a, i) => { const [x1, y1, x2, y2] = ends[i];
        L.setArrow(a, x1, y1, L.mix(x1, x2, grow), L.mix(y1, y2, grow)); L.op(a, grow > 0.001 ? 1 : 0); });
      sigs.forEach(n => L.op(n, sig));
    }
  });
})();
