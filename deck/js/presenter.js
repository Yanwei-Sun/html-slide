// Presenter controls. Nothing appears while you talk unless you ask for it: the bottom bar no longer slides up when the
// pointer reaches the bottom edge. The deliberate ways in:
//   S          the Slides overview (G also works); type a slide number + Enter to jump
//   S S        the speaker script (press S twice quickly); it has no button, so a stray click never shows it to the audience
//   C          comment on the current slide and click
//   F          full screen (handled by the engine)
//   M, or the dot in the bottom-right corner (it fades in only when the pointer comes near): the menu (Slides, Full screen, Comment)
// The menu closes once one of its buttons is used, and on Escape, M, the dot, or a click on the slide (that click does not
// advance). The pointer hides after 2 s without moving.
(function () {
  const B = document.body; B.classList.add('pres');
  let sT = null;
  const typing = e => e.target && e.target.closest && e.target.closest('textarea, input, [contenteditable="true"]');
  const isOn = () => B.classList.contains('pres-menu');
  const menu = on => B.classList.toggle('pres-menu', on === undefined ? !isOn() : on);
  const btn = a => document.querySelector('#bar [data-a="' + a + '"]');
  const h = document.createElement('div'); h.id = 'pres-handle'; h.textContent = '⋯';
  h.title = 'Slides (S) · Script (S S) · Comment (C) · Menu (M) · Full screen (F)'; B.appendChild(h);
  ['pointerdown', 'mousedown', 'click'].forEach(t => h.addEventListener(t, e => { e.stopPropagation(); if (t === 'click') menu(); }));
  addEventListener('keydown', e => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 's' || e.key === 'S') {
      e.stopImmediatePropagation(); e.preventDefault(); if (e.repeat) return; menu(false);
      if (sT) { clearTimeout(sT); sT = null; const b = btn('script'); if (b) b.click(); return; }   // S S: the script, on or off
      sT = setTimeout(() => { sT = null; const b = btn('slides'); if (b) b.click(); }, 320); return;   // one S: Slides
    }
    if (e.key === 'm' || e.key === 'M') { e.stopImmediatePropagation(); e.preventDefault(); menu(); return; }
    if (e.key === 'c' || e.key === 'C') { const b = btn('comment'); if (b) { e.stopImmediatePropagation(); e.preventDefault(); menu(false); b.click(); } return; }
    if (e.key === 'Escape' || e.key === 'g' || e.key === 'G') menu(false);
  }, true);
  // while the menu is open, a click elsewhere only closes it (no slide advance)
  addEventListener('click', e => {
    if (!isOn() || e.button !== 0) return;
    if (e.target.closest && e.target.closest('#bar, #pres-handle, #overview, #cmt, [class^="cmt-"], [class*=" cmt-"]')) return;
    e.stopPropagation(); e.preventDefault(); menu(false);
  }, true);
  const hook = () => { const bar = document.getElementById('bar'); if (!bar) return setTimeout(hook, 200);
    bar.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(() => menu(false), 0); }); };
  hook();
  let idleT = null;
  const wake = () => { B.classList.remove('pres-idle'); clearTimeout(idleT); idleT = setTimeout(() => B.classList.add('pres-idle'), 2000); };
  addEventListener('mousemove', e => { wake(); B.classList.toggle('pres-near', innerWidth - e.clientX < 110 && innerHeight - e.clientY < 110); });
  wake();
})();
