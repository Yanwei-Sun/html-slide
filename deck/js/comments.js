// Slide comments, image attachments and marked boxes; API access is enabled by the Cloudflare middleware.
(function () {
  'use strict';
  const DECK = 'template';
  const COLLABORATION = window.DECK_COLLABORATION === true;
  const API = '/__comments';
  const POLL_MS = 30000;
  const SW = 1920, SH = 1080; 
  const MAX_IMGS = 4, MAX_SIDE = 1600, MAX_BYTES = 900 * 1024, MAX_BODY = 8 * 1024 * 1024, MIN_BOX = 12;
  let panel = null, btn = null, isOpen = false, timer = null, showAll = false, sending = false;
  let list = [], pending = []; 
  const draft = { imgs: [], busy: 0, box: null }; 
  let shownCid = null; 
  let marking = null; 
  let lightbox = null;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const decoder = document.createElement('textarea');
  function plainTitle(h) { 
    const s = String(h || '').replace(/<[^>]+>/g, '').replace(/\\\(|\\\)/g, '').replace(/\\neq/g, '≠').replace(/\\[a-zA-Z]+/g, '').replace(/[{}^_]/g, '');
    decoder.innerHTML = s;
    return decoder.value.replace(/\s+/g, ' ').trim();
  }
  function here() {
    const D = window.Deck, s = D.slides[D.cur] || {};
    return { n: D.cur + 1, k: D.step || 0, sid: s.id || '', title: plainTitle(s.name || s.title || (s.kind === 'title' ? 'Title' : s.id)) };
  }
  const onSlide = (c, h) => (c.sid ? c.sid === h.sid : +c.n === h.n);
  const atClick = (c, h) => onSlide(c, h) && +(c.k || 0) === h.k;
  function when(c) {
    let t = c.created;
    if (typeof t === 'number' && t < 1e11) t *= 1000;
    const d = new Date(t);
    if (isNaN(d)) return '';
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  const tms = c => { const t = typeof c.created === 'number' ? (c.created < 1e11 ? c.created * 1000 : c.created) : Date.parse(c.created); return isNaN(t) ? 0 : t; };
  const kb = n => n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const imgURL = (c, im) => im.url || (API + '/img?cid=' + encodeURIComponent(c.cid) + '&i=' + encodeURIComponent(im.i));
  const validBox = b => b && ['x', 'y', 'w', 'h'].every(f => typeof b[f] === 'number' && isFinite(b[f])) && b.w > 0 && b.h > 0;

  function status(msg, kind, src) {
    const s = panel.querySelector('.cst'); s.textContent = msg || ''; s.className = 'cst' + (kind ? ' ' + kind : '');
    s.dataset.src = src || '';
  }

  function decode(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => res({ im, u });
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('this browser cannot read ' + (file.type || 'that file'))); };
      im.src = u;
    });
  }
  const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  async function shrink(file) { 
    const { im, u } = await decode(file);
    try {
      const w0 = im.naturalWidth, h0 = im.naturalHeight;
      if (!w0 || !h0) throw new Error('the image is empty');
      let s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
      for (let round = 0; round < 6; round++, s *= 0.75) {
        const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(im, 0, 0, w, h);
        let flat = null; 
        for (const q of [0.85, 0.72, 0.6]) {
          let b = await toBlob(c, 'image/webp', q), mime = 'image/webp';
          if (!b || b.type !== 'image/webp') {
            if (!flat) { flat = document.createElement('canvas'); flat.width = w; flat.height = h; const f = flat.getContext('2d'); f.fillStyle = '#fff'; f.fillRect(0, 0, w, h); f.drawImage(c, 0, 0); }
            b = await toBlob(flat, 'image/jpeg', q); mime = 'image/jpeg';
          }
          if (b && b.size <= MAX_BYTES) return { blob: b, mime, w, h };
        }
      }
      throw new Error('still too large after downsizing');
    } finally { URL.revokeObjectURL(u); }
  }
  const base64 = blob => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).slice(String(r.result).indexOf(',') + 1));
    r.onerror = () => rej(new Error('could not read the image'));
    r.readAsDataURL(blob);
  });
  async function addFiles(files) {
    files = Array.from(files || []).filter(f => f && /^image\//.test(f.type || ''));
    if (!files.length) { status('Only image files can be attached.', 'err', 'img'); return; }
    const room = MAX_IMGS - draft.imgs.length - draft.busy;
    if (room <= 0) { status('At most ' + MAX_IMGS + ' images per comment.', 'err', 'img'); return; }
    if (files.length > room) status('At most ' + MAX_IMGS + ' images per comment: added the first ' + room + '.', 'err', 'img');
    files = files.slice(0, room);
    draft.busy += files.length; renderDraft();
    await Promise.all(files.map(async f => {
      try {
        const r = await shrink(f), data = await base64(r.blob);
        draft.imgs.push({ mime: r.mime, data, w: r.w, h: r.h, bytes: r.blob.size, url: URL.createObjectURL(r.blob) });
      } catch (e) {
        status('Could not add ' + (f.name || 'the image') + ': ' + e.message + '.', 'err', 'img');
      } finally { draft.busy--; renderDraft(); }
    }));
    const s = panel.querySelector('.cst');
    if (s.dataset.src === 'img' && !s.classList.contains('err')) status('');
  }
  const imageFiles = dt => {
    if (!dt) return [];
    const fs = Array.from(dt.files || []).filter(f => /^image\//.test(f.type || ''));
    if (fs.length) return fs;
    return Array.from(dt.items || []).filter(it => it.kind === 'file' && /^image\//.test(it.type || '')).map(it => it.getAsFile()).filter(Boolean);
  };

  function drawBoxes() {
    const st = document.getElementById('stage');
    if (!st) return;
    st.querySelectorAll('.cmt-box').forEach(e => { if (!marking || e !== marking.el) e.remove(); });
    if (!isOpen) return;
    const h = here(), put = (b, cls) => {
      const e = document.createElement('div');
      e.className = 'cmt-box ' + cls;
      e.style.left = b.x + 'px'; e.style.top = b.y + 'px'; e.style.width = b.w + 'px'; e.style.height = b.h + 'px';
      st.appendChild(e);
    };
    if (draft.box && atClick(draft.box, h) && !marking) put(draft.box, 'draft');
    if (shownCid) {
      const c = allComments().find(x => x.cid === shownCid);
      if (c && validBox(c.box) && atClick(c, h)) put(c.box, 'shown');
    }
  }
  function stagePoint(e) {
    const r = document.getElementById('stage').getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * SW, y = (e.clientY - r.top) / r.height * SH;
    return { x: Math.max(0, Math.min(SW, x)), y: Math.max(0, Math.min(SH, y)) };
  }
  function placeOverlay() {
    if (!marking) return;
    const r = document.getElementById('viewport').getBoundingClientRect(), o = marking.ov.style;
    o.left = r.left + 'px'; o.top = r.top + 'px'; o.width = r.width + 'px'; o.height = r.height + 'px';
  }
  function startMark() {
    if (marking) return;
    if (lightbox) closeLightbox();
    if (document.activeElement && panel.contains(document.activeElement)) document.activeElement.blur();
    const ov = document.createElement('div');
    ov.id = 'cmt-mark';
    ov.innerHTML = '<div class="cmt-mhint">Drag a box over the slide · Esc cancels</div>';
    document.body.appendChild(ov);
    document.body.classList.add('cmt-marking');
    marking = { ov, el: null, x0: 0, y0: 0, down: false };
    placeOverlay(); drawBoxes();
    panel.querySelector('.cmk').classList.add('act');
    status('Drag a rectangle over the slide. Esc cancels.', '', 'mark');
    ov.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      try { ov.setPointerCapture(e.pointerId); } catch (_) {}
      const p = stagePoint(e);
      marking.x0 = p.x; marking.y0 = p.y; marking.down = true;
      if (!marking.el) { marking.el = document.createElement('div'); marking.el.className = 'cmt-box draft'; document.getElementById('stage').appendChild(marking.el); }
      sizeMark(p);
    });
    ov.addEventListener('pointermove', e => { if (marking && marking.down) sizeMark(stagePoint(e)); });
    ov.addEventListener('pointerup', e => {
      if (!marking || !marking.down) return;
      e.stopPropagation(); marking.down = false;
      const b = sizeMark(stagePoint(e));
      if (b.w < MIN_BOX || b.h < MIN_BOX) { status('Drag to draw a box (a single click is not enough). Esc cancels.', 'err', 'mark'); if (marking.el) { marking.el.remove(); marking.el = null; } return; }
      const h = here();
      draft.box = { x: b.x, y: b.y, w: b.w, h: b.h, n: h.n, k: h.k, sid: h.sid };
      endMark(true);
    });
    ov.addEventListener('click', e => e.stopPropagation());
    ov.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
  }
  function sizeMark(p) {
    const x = Math.round(Math.min(marking.x0, p.x)), y = Math.round(Math.min(marking.y0, p.y));
    const b = { x, y, w: Math.round(Math.max(marking.x0, p.x)) - x, h: Math.round(Math.max(marking.y0, p.y)) - y };
    const s = marking.el.style;
    s.left = b.x + 'px'; s.top = b.y + 'px'; s.width = b.w + 'px'; s.height = b.h + 'px';
    return b;
  }
  function endMark(done) {
    if (!marking) return;
    if (marking.el) marking.el.remove();
    marking.ov.remove(); marking = null;
    document.body.classList.remove('cmt-marking');
    panel.querySelector('.cmk').classList.remove('act');
    status(done ? 'Box marked on #' + draft.box.n + '.' + draft.box.k + '.' : '', done ? 'ok' : '', 'mark');
    renderDraft();
    if (isOpen) panel.querySelector('.cta').focus();
  }

  function openLightbox(src, cap) {
    closeLightbox();
    lightbox = document.createElement('div');
    lightbox.id = 'cmt-lb';
    lightbox.setAttribute('role', 'dialog'); lightbox.setAttribute('aria-label', 'Image');
    lightbox.innerHTML = '<img alt=""><div class="cmt-lbcap"></div><button type="button" class="cmt-lbx" aria-label="Close (Esc)" title="Close (Esc)">×</button>';
    lightbox.querySelector('img').src = src;
    lightbox.querySelector('.cmt-lbcap').textContent = cap || '';
    lightbox.addEventListener('click', e => { e.stopPropagation(); closeLightbox(); });
    document.body.appendChild(lightbox);
  }
  function closeLightbox() { if (lightbox) { lightbox.remove(); lightbox = null; } }

  function renderHead() {
    const h = here();
    panel.querySelector('.cn').textContent = '#' + h.n + '.' + h.k;
    panel.querySelector('.ct').textContent = h.title;
  }
  function renderDraft() {
    const t = panel.querySelector('.cdraft');
    t.innerHTML = draft.imgs.map((m, i) =>
      '<div class="cth"><button type="button" class="cthb" data-i="' + i + '" title="' + m.w + ' × ' + m.h + ', ' + kb(m.bytes) + '"><img src="' + esc(m.url) + '" alt="Image ' + (i + 1) + '"></button>' +
      '<button type="button" class="crm" data-i="' + i + '" aria-label="Remove image ' + (i + 1) + '" title="Remove">×</button></div>').join('') +
      Array.from({ length: draft.busy }, () => '<div class="cth busy"><span>…</span></div>').join('');
    t.style.display = draft.imgs.length || draft.busy ? '' : 'none';
    const br = panel.querySelector('.cboxrow'), b = draft.box;
    br.style.display = b ? '' : 'none';
    if (b) br.querySelector('.cboxl').textContent = 'Box on #' + b.n + '.' + b.k + ' (' + b.w + ' × ' + b.h + ' at ' + b.x + ', ' + b.y + ')';
    const n = draft.imgs.length + draft.busy;
    panel.querySelector('.cat').disabled = n >= MAX_IMGS;
    panel.querySelector('.cat').innerHTML = n >= MAX_IMGS ? 'Image limit reached (' + MAX_IMGS + ')' : '<b>Add a screenshot:</b> drag it here, paste with ⌘V, or click to choose' + (n ? ' (' + n + '/' + MAX_IMGS + ')' : '');
    drawBoxes();
  }
  const allComments = () => list.concat(pending.filter(p => !list.some(c => c.cid === p.cid)));
  function renderList() {
    const h = here();
    const all = allComments();
    let shown;
    if (showAll) shown = all.slice().sort((a, b) => (+a.n - +b.n) || (+a.k - +b.k) || (tms(a) - tms(b)));
    else shown = all.filter(c => onSlide(c, h)).sort((a, b) => tms(a) - tms(b));
    panel.querySelector('.clt').textContent = showAll ? 'All comments (' + all.length + ')' : 'Comments on this slide (' + shown.length + ')';
    const box = panel.querySelector('.cl');
    if (!shown.length) { box.innerHTML = '<div class="cnone">' + (showAll ? 'No comments yet.' : 'No comments on this slide yet.') + '</div>'; drawBoxes(); return; }
    box.innerHTML = shown.map(c => {
      const done = c.status === 'done', imgs = Array.isArray(c.images) ? c.images : [], hasBox = validBox(c.box), on = shownCid === c.cid;
      return '<div class="ci' + (done ? ' done' : '') + (showAll && onSlide(c, h) ? ' here' : '') + '" data-cid="' + esc(c.cid) + '">' +
        '<div class="cm">' + (c.author ? '<span class="cau">' + esc(c.author) + '</span>' : '') + '<span>' + esc(when(c)) + '</span>' +
        '<span class="cpos">#' + esc(c.n) + '.' + esc(c.k || 0) + '</span>' + (done ? '<span class="ctag">done</span>' : '') +
        (hasBox ? '<button type="button" class="cbx' + (on ? ' act' : '') + '" data-cid="' + esc(c.cid) + '">' + (on ? 'hide box' : 'show box') + '</button>' : '') + '</div>' +
        (showAll && c.title ? '<div class="cslide">' + esc(c.title) + '</div>' : '') +
        (c.text ? '<div class="ctx">' + esc(c.text) + '</div>' : (!imgs.length && hasBox ? '<div class="ctx cbo">Marked a box on the slide.</div>' : '')) +
        (imgs.length ? '<div class="cimgs">' + imgs.map((m, j) => '<button type="button" class="cthb" data-cid="' + esc(c.cid) + '" data-j="' + j + '" title="' + esc((m.w || '?') + ' × ' + (m.h || '?')) + '">' +
          '<img loading="lazy" src="' + esc(imgURL(c, m)) + '" alt="Image ' + (j + 1) + '"></button>').join('') + '</div>' : '') +
        (done && c.reply ? '<div class="crp"><span class="crl">Reply</span>' + esc(c.reply) + '</div>' : '') +
        '</div>';
    }).join('');
    drawBoxes();
  }

  async function load() {
    if (!isOpen) return;
    if (!COLLABORATION) { status('Comments are available in the Cloudflare preview or shared site.', '', 'load'); return; }
    try {
      const r = await fetch(API + '?deck=' + encodeURIComponent(DECK), { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (r.status === 401) { status('Your session has expired: reload the page and enter the passcode again.', 'err', 'load'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      list = Array.isArray(j.comments) ? j.comments : [];
      pending = pending.filter(p => {
        const keep = !list.some(c => c.cid === p.cid);
        if (!keep) (p.images || []).forEach(m => m.url && setTimeout(() => URL.revokeObjectURL(m.url), 60000));
        return keep;
      });
      const s = panel.querySelector('.cst');
      if (s.classList.contains('err') && s.dataset.src === 'load') status('');
      renderList();
    } catch (e) {
      status('Could not load the comments (' + e.message + '). Retrying in 30 s.', 'err', 'load');
    }
  }

  async function send() {
    if (sending) return;
    if (!COLLABORATION) { status('Open the Cloudflare preview or shared site to send this comment.', '', 'send'); return; }
    const ta = panel.querySelector('.cta');
    const text = ta.value.trim(), author = ''; 
    const h = here(), b = draft.box;
    if (draft.busy) { status('Still preparing the images: one moment.', 'err', 'send'); return; }
    if (!text && !draft.imgs.length && !b) { status('Write a comment, attach an image or mark a box first.', 'err', 'send'); ta.focus(); return; }
    if (text.length > 4000) { status('Please keep the comment under 4000 characters (now ' + text.length + ').', 'err', 'send'); return; }
    if (b && !atClick(b, h)) { status('The box was drawn on #' + b.n + '.' + b.k + ': go back there to send, or clear the box.', 'err', 'send'); return; }
    const box = b ? { x: b.x, y: b.y, w: b.w, h: b.h } : null;
    const images = draft.imgs.map(m => ({ mime: m.mime, data: m.data, w: m.w, h: m.h }));
    const body = { deck: DECK, n: h.n, k: h.k, sid: h.sid, title: h.title, author, text };
    if (images.length) body.images = images;
    if (box) body.box = box;
    const json = JSON.stringify(body);
    if (json.length > MAX_BODY) { status('The images are too large together: remove one and send again.', 'err', 'send'); return; }
    sending = true; panel.querySelector('.cs').disabled = true;
    status(images.length ? 'Sending (' + kb(json.length) + ')…' : 'Sending…', '', 'send');
    try {
      const r = await fetch(API, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: json });
      let j = {}; try { j = await r.json(); } catch (e) {}
      if (r.status === 401) { status('Your session has expired: reload the page and enter the passcode again. (Your comment is still here.)', 'err', 'send'); return; }
      if (!r.ok || !j.ok) { status('Not sent: ' + (j.error || 'HTTP ' + r.status) + '. Your comment is still here.', 'err', 'send'); return; }
      pending.push({ cid: j.cid || ('local-' + Date.now()), deck: DECK, n: h.n, k: h.k, sid: h.sid, title: h.title, author, text,
        created: new Date().toISOString(), status: 'open', reply: '', box,
        images: draft.imgs.map((m, i) => ({ i, mime: m.mime, w: m.w, h: m.h, bytes: m.bytes, url: m.url })) });
      ta.value = ''; draft.imgs = []; draft.box = null;
      status('Sent to #' + h.n + '.' + h.k + '. Thank you.', 'ok', 'send');
      renderDraft(); renderList();
      setTimeout(load, 1500);
    } catch (e) {
      status('Not sent (' + e.message + '). Check the connection; your comment is still here.', 'err', 'send');
    } finally {
      sending = false; panel.querySelector('.cs').disabled = false;
    }
  }

  function openPanel(on) {
    isOpen = on === undefined ? !isOpen : !!on;
    if (!isOpen) { endMark(false); closeLightbox(); }
    panel.classList.toggle('on', isOpen);
    document.body.classList.toggle('cmt-on', isOpen);
    if (btn) btn.classList.toggle('act', isOpen);
    window.dispatchEvent(new Event('resize')); 
    clearInterval(timer); timer = null;
    if (isOpen) {
      renderHead(); renderDraft(); renderList(); load();
      if (COLLABORATION) timer = setInterval(load, POLL_MS);
      panel.querySelector('.cta').focus();
    } else {
      if (document.activeElement && panel.contains(document.activeElement)) document.activeElement.blur(); 
      drawBoxes();
    }
  }

  function build() {
    panel = document.createElement('div');
    panel.id = 'cmt';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Comments');
    panel.innerHTML =
      '<div class="ch"><div class="cw">Comment on <span class="cn"></span> · <span class="ct"></span></div>' +
      '<button class="cx" type="button" title="Close (Esc)" aria-label="Close">×</button></div>' +
      '<label class="cnl" for="cmt-text">Comment on this slide and click</label>' +
      '<textarea class="cta" id="cmt-text" maxlength="4000" placeholder="What should change here?"></textarea>' +
      '<div class="cimgs cdraft" style="display:none"></div>' +
      '<div class="cboxrow" style="display:none"><span class="cboxl"></span><button type="button" class="cbc">clear box</button></div>' +
      '<button type="button" class="czone cat"><b>Add a screenshot:</b> drag it here, paste with ⌘V, or click to choose</button>' +
      '<div class="ctools"><button type="button" class="ctl cmk"><b>Mark on slide:</b> drag a box over the part you mean</button>' +
      '<input type="file" class="cfile" accept="image/*" multiple hidden></div>' +
      '<div class="crow"><button class="cs" type="button">Send</button><span class="chint">or ⌘/Ctrl + Enter</span></div>' +
      '<div class="cst" aria-live="polite"></div>' +
      '<div class="clh"><span class="clt"></span><label><input type="checkbox" class="call"> show all slides</label></div>' +
      '<div class="cl"></div>' +
      '<div class="cdrop">Drop images to attach</div>';
    document.body.appendChild(panel);
    const q = s => panel.querySelector(s);
    q('.cx').addEventListener('click', () => openPanel(false));
    q('.cs').addEventListener('click', send);
    q('.call').addEventListener('change', e => { showAll = e.target.checked; renderList(); });
    q('.cat').addEventListener('click', () => q('.cfile').click());
    q('.cfile').addEventListener('change', e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) addFiles(f); });
    q('.cmk').addEventListener('click', () => (marking ? endMark(false) : startMark()));
    q('.cbc').addEventListener('click', () => { draft.box = null; status(''); renderDraft(); });
    q('.cdraft').addEventListener('click', e => {
      const rm = e.target.closest('.crm'), th = e.target.closest('.cthb');
      if (rm) { const m = draft.imgs.splice(+rm.dataset.i, 1)[0]; if (m) URL.revokeObjectURL(m.url); renderDraft(); return; }
      if (th) { const m = draft.imgs[+th.dataset.i]; if (m) openLightbox(m.url, 'Image ' + (+th.dataset.i + 1) + ' · ' + m.w + ' × ' + m.h + ' · ' + kb(m.bytes)); }
    });
    q('.cl').addEventListener('click', e => {
      const bx = e.target.closest('.cbx'), th = e.target.closest('.cthb');
      if (bx) {
        const c = allComments().find(x => x.cid === bx.dataset.cid);
        if (!c) return;
        shownCid = shownCid === c.cid ? null : c.cid;
        const D = window.Deck, h = here();
        if (shownCid && !atClick(c, h)) { 
          let i = c.sid ? D.slides.findIndex(s => s.id === c.sid) : -1;
          if (i < 0) i = +c.n - 1;
          D.go(i, +(c.k || 0), false);
        }
        renderList();
        return;
      }
      if (th) {
        const c = allComments().find(x => x.cid === th.dataset.cid), m = c && (c.images || [])[+th.dataset.j];
        if (m) openLightbox(imgURL(c, m), '#' + c.n + '.' + (c.k || 0) + ' · image ' + (+th.dataset.j + 1) + (m.w ? ' · ' + m.w + ' × ' + m.h : ''));
      }
    });
    document.addEventListener('paste', e => {
      if (!isOpen || marking) return;
      const t = e.target;
      if (!panel.contains(t) && t && t.closest && t.closest('textarea, input, [contenteditable="true"]')) return; 
      const f = imageFiles(e.clipboardData);
      if (f.length) { e.preventDefault(); addFiles(f); }
    });
    const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    let dragN = 0;
    panel.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); dragN++; panel.classList.add('drop'); });
    panel.addEventListener('dragover', e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    panel.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; panel.classList.remove('drop'); } });
    panel.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dragN = 0; panel.classList.remove('drop'); addFiles(imageFiles(e.dataTransfer)); });
    addEventListener('dragover', e => { if (isOpen && hasFiles(e)) e.preventDefault(); });
    addEventListener('drop', e => { if (isOpen && hasFiles(e)) e.preventDefault(); });
    panel.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); openPanel(false); return; }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
    });
    panel.addEventListener('keyup', e => e.stopPropagation());
    panel.addEventListener('keypress', e => e.stopPropagation());
    panel.addEventListener('click', e => e.stopPropagation());
    addEventListener('keydown', e => {
      if (!marking && !lightbox) return;
      e.stopImmediatePropagation(); e.stopPropagation();
      if (e.metaKey || e.ctrlKey) return; 
      e.preventDefault();
      if (e.key === 'Escape') { if (lightbox) closeLightbox(); else endMark(false); }
    }, true);
    addEventListener('keyup', e => { if (marking || lightbox) e.stopImmediatePropagation(); }, true);
    addEventListener('keydown', e => { if (isOpen && e.key === 'Escape') openPanel(false); }); 
    addEventListener('resize', placeOverlay);
    document.addEventListener('visibilitychange', () => { if (isOpen && !document.hidden) load(); });

    const bar = document.getElementById('bar');
    btn = document.createElement('button');
    btn.dataset.a = 'comment'; btn.type = 'button'; btn.textContent = 'Comment'; btn.title = 'Comment on this slide';
    btn.addEventListener('click', e => { e.stopPropagation(); openPanel(); });
    bar.appendChild(btn);

    const D = window.Deck, go = D.go;
    D.go = function () { const r = go.apply(this, arguments); if (isOpen) { renderHead(); renderList(); } return r; };
  }

  (function wait(tries) { 
    if (document.getElementById('bar') && window.Deck && Deck.slides.length) { build(); return; }
    if (document.body.classList.contains('print') || tries > 3000) return;
    setTimeout(() => wait(tries + 1), 100);
  })(0);
})();

(function () {
  if (window.DECK_COLLABORATION !== true || !window.localStorage || !window.fetch || location.protocol === 'file:') return;
  const DECK = 'template', KEY = 'deck-script-edits:' + location.pathname;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const parse = value => { try { const result = JSON.parse(value || '{}'); return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; } };
  const notes = sid => { const slide = window.Deck && Deck.slides.find(value => value.id === sid); return !slide?.notes ? [] : Array.isArray(slide.notes) ? slide.notes : [slide.notes]; };
  const original = (sid, k) => notes(sid)[k] || '';
  const known = (sid, k) => typeof sid === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(sid) && Number.isInteger(k) && k >= 0 && k < notes(sid).length;
  const states = new Map();
  let ready = null, notices = null;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  function state(sid, k) {
    const key = sid + '|' + k;
    if (!states.has(key)) states.set(key, { key, sid, k, revision: null, orig: original(sid, k), pending: null, due: 0, saving: false, blocked: false, card: null });
    return states.get(key);
  }
  function area() {
    if (!notices) {
      notices = document.createElement('div'); notices.id = 'script-sync-status';
      notices.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;max-width:min(420px,calc(100vw - 24px));max-height:70vh;overflow:auto;font:14px/1.4 system-ui,sans-serif;color:#222';
      document.body.appendChild(notices);
    }
    return notices;
  }
  function clearProblem(item) { item.card?.remove(); item.card = null; item.yours = null; }
  function saved(item) {
    clearProblem(item);
    const message = document.createElement('div'); message.setAttribute('role', 'status');
    message.style.cssText = 'padding:8px 12px;margin-top:6px;background:#fff;border:1px solid #b9d4c9;border-radius:6px;color:#1d6b52';
    message.textContent = 'Script saved on the server (' + item.sid + ', click ' + item.k + ').';
    area().appendChild(message); setTimeout(() => message.remove(), 3000);
  }
  function localValue(item) {
    if (item.pending) return item.pending.text;
    const edits = parse(localStorage.getItem(KEY)), slide = edits[item.sid];
    return slide && own(slide, item.k) ? slide[item.k] : null;
  }
  function writeEdits(edits) {
    const previous = window.__scriptTidy; window.__scriptTidy = true;
    try { localStorage.setItem(KEY, JSON.stringify(edits)); }
    finally { window.__scriptTidy = previous; }
  }
  function setLocal(item, value) {
    const edits = parse(localStorage.getItem(KEY));
    if (value === null || value === original(item.sid, item.k)) {
      if (own(edits, item.sid)) { delete edits[item.sid][item.k]; if (!Object.keys(edits[item.sid]).length) delete edits[item.sid]; }
    } else {
      if (!own(edits, item.sid) || !edits[item.sid] || typeof edits[item.sid] !== 'object') edits[item.sid] = {};
      edits[item.sid][item.k] = value;
    }
    writeEdits(edits);
    try { Deck.go(Deck.cur, Deck.step || 0, false); } catch { /* The draft remains saved if the panel is closed. */ }
  }
  function button(label, action, parent) {
    const result = document.createElement('button'); result.type = 'button'; result.textContent = label;
    result.style.cssText = 'font:inherit;padding:6px 9px;margin:8px 6px 0 0;cursor:pointer';
    result.addEventListener('click', event => { event.stopPropagation(); action(); }); parent.appendChild(result);
  }
  function problem(item, message, current, conflict) {
    clearProblem(item); item.blocked = true;
    const card = document.createElement('div'); item.card = card;
    card.style.cssText = 'padding:12px;margin-top:8px;background:#fff;border:2px solid #c96b36;border-radius:8px;box-shadow:0 2px 12px #0002';
    const heading = document.createElement('strong'); heading.textContent = item.sid + ', click ' + item.k + ': script not saved'; card.appendChild(heading);
    const description = document.createElement('p'); description.setAttribute('role', 'alert'); description.textContent = message + ' Your text stays in this browser.'; card.appendChild(description);
    if (conflict) {
      for (const [label, value, yours] of [
        ['Shared version', current?.text ?? original(item.sid, item.k), false],
        ['Your version', localValue(item) ?? original(item.sid, item.k), true],
      ]) {
        const caption = document.createElement('label'); caption.textContent = label;
        const text = document.createElement('textarea'); text.readOnly = true; text.value = value;
        text.style.cssText = 'display:block;box-sizing:border-box;width:100%;min-height:72px;font:13px/1.4 system-ui,sans-serif';
        caption.appendChild(text); card.appendChild(caption); if (yours) item.yours = text;
      }
      button('Use shared version', () => {
        item.revision = current?.updated ?? null; item.orig = current?.orig ?? original(item.sid, item.k);
        item.pending = null; item.blocked = false; clearProblem(item); setLocal(item, current?.text ?? null);
      }, card);
      button('Save my version', () => {
        const text = localValue(item);
        item.revision = current?.updated ?? null; item.orig = current?.orig ?? original(item.sid, item.k);
        item.pending = { text }; item.due = 0; item.blocked = false; clearProblem(item); pump(item);
      }, card);
    } else {
      button('Retry save', () => { item.blocked = false; clearProblem(item); pump(item); }, card);
    }
    area().appendChild(card);
  }
  async function initialize() {
    if (ready) return ready;
    ready = (async () => {
      for (let tries = 0; !window.Deck?.ready; tries++) { if (tries >= 120) throw new Error('The deck is still loading.'); await pause(500); }
      const response = await fetch('/__script?deck=' + DECK, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.rows) || !Array.isArray(data.open)) throw new Error('Could not read shared note revisions.');
      const edits = parse(localStorage.getItem(KEY)); let changed = false;
      for (const item of states.values()) { item.revision = null; item.orig = original(item.sid, item.k); }
      for (const row of data.rows) {
        if (!known(row.sid, row.k) || !own(edits, row.sid) || !own(edits[row.sid], row.k)) continue;
        if (edits[row.sid][row.k] === row.sent && original(row.sid, row.k) !== row.orig) {
          delete edits[row.sid][row.k]; if (!Object.keys(edits[row.sid]).length) delete edits[row.sid]; changed = true;
        }
      }
      for (const row of data.open) {
        if (!known(row.sid, row.k) || typeof row.updated !== 'string' || typeof row.orig !== 'string' || (row.text !== null && typeof row.text !== 'string')) continue;
        const item = state(row.sid, row.k); item.revision = row.updated; item.orig = row.orig;
        const hasLocal = own(edits, row.sid) && own(edits[row.sid], row.k);
        const local = item.pending ? item.pending.text : hasLocal ? edits[row.sid][row.k] : null;
        if ((item.pending || hasLocal) && local !== row.text) {
          if (!item.pending) item.pending = { text: local };
          problem(item, 'Another coauthor has a different saved version. Review both versions.', row, true);
        } else {
          if (item.pending?.text === row.text) item.pending = null;
          if (row.text !== null && !hasLocal) { if (!own(edits, row.sid)) edits[row.sid] = {}; edits[row.sid][row.k] = row.text; changed = true; }
        }
      }
      if (changed) { writeEdits(edits); try { Deck.go(Deck.cur, Deck.step || 0, false); } catch { /* The saved drafts remain available. */ } }
      return true;
    })().catch(() => { ready = null; return false; });
    return ready;
  }
  async function pump(item) {
    if (item.saving || item.blocked || !item.pending) return;
    item.saving = true;
    try {
      if (!await initialize()) { problem(item, 'Could not read the shared script. Check the connection and retry.', null, false); return; }
      while (item.pending && !item.blocked) {
        const delay = item.due - Date.now(); if (delay > 0) { await pause(delay); continue; }
        const pending = item.pending; item.pending = null;
        const sent = { deck: DECK, sid: item.sid, k: item.k, text: pending.text, orig: item.orig, updated: item.revision };
        try {
          const response = await fetch('/__script', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sent) });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok && typeof data.updated === 'string') { item.revision = data.updated; if (!item.pending) saved(item); continue; }
          if (response.status === 409) {
            const current = data.current;
            if (current && current.text === sent.text && current.orig === sent.orig && typeof current.updated === 'string') { item.revision = current.updated; if (!item.pending) saved(item); continue; }
            if (!item.pending) item.pending = pending;
            problem(item, 'Another coauthor saved this note. Review both versions before saving again.', current, true);
          } else {
            if (!item.pending) item.pending = pending;
            problem(item, data.error || 'The server could not save the note.', null, false);
          }
        } catch {
          if (!item.pending) item.pending = pending;
          problem(item, 'No connection to the shared site. Check the connection and retry.', null, false);
        }
      }
    } finally { item.saving = false; }
  }
  function queue(sid, k, text) {
    if (!known(sid, k)) return;
    const item = state(sid, k); item.pending = { text }; item.due = Date.now() + 1500;
    if (item.yours) item.yours.value = text ?? original(sid, k);
    clearTimeout(item.timer); item.timer = setTimeout(() => pump(item), 1500);
  }
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const before = this === window.localStorage && !window.__scriptTidy && key === KEY ? parse(this.getItem(key)) : null;
    const result = set.apply(this, arguments);
    if (before) {
      const after = parse(value), keys = new Set();
      for (const edits of [before, after]) for (const sid of Object.keys(edits)) for (const k of Object.keys(edits[sid] || {})) keys.add(sid + '|' + k);
      for (const key of keys) {
        const [sid, k] = key.split('|'), a = before[sid]?.[k], b = after[sid]?.[k];
        if (a !== b) queue(sid, Number(k), b === undefined ? null : b);
      }
    }
    return result;
  };
  initialize();
})();
