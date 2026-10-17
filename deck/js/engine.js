// Deck engine: slide builds, animation, navigation, notes, overview, and printing.
(function () {
  const W = 1920, H = 1080;
  const D = window.Deck = { slides: [], cur: 0, step: 0, busy: null, lib: {}, ready: false };
  const $ = s => document.querySelector(s);
  D.slide = spec => { D.slides.push(spec); };

  // ---------- tween machinery ----------
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  D.ease = ease;
  function lerp(a, b, t) {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
    if (Array.isArray(a) && Array.isArray(b)) return b.map((x, i) => lerp(a[i], x, t));
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const o = {}; for (const k in b) o[k] = k in a ? lerp(a[k], b[k], t) : b[k]; return o;
    }
    return t < 1 ? a : b;
  }
  D.lerp = lerp;
  // tween(ms, fn(t in 0..1, eased), tok) -> Promise; jumps to the end if tok.skip is set,
  // and stops without drawing if tok.dead is set (the animation was interrupted by a jump)
  D.tween = function (ms, fn, tok) {
    tok = tok || D.busy || { skip: false };
    return new Promise(res => {
      const t0 = performance.now();
      function frame(now) {
        if (tok.dead) { res(); return; }
        let t = ms > 0 ? Math.min(1, (now - t0) / ms) : 1;
        if (tok.skip) t = 1;
        fn(ease(t), t);
        if (t < 1) requestAnimationFrame(frame); else res();
      }
      requestAnimationFrame(frame);
    });
  };
  D.wait = (ms, tok) => { tok = tok || D.busy || { skip: false };
    return new Promise(res => { const t0 = performance.now(); (function f(now) { if (tok.skip || now - t0 >= ms) res(); else requestAnimationFrame(f); })(t0); }); };

  // ---------- mounting ----------
  function mount(spec, host, index) {
    const el = document.createElement('section');
    el.className = 'slide' + (spec.kind ? ' ' + spec.kind : '');
    el.dataset.id = spec.id;
    let h = '';
    if (spec.section && !spec.kind) h += `<div class="section-tag">${spec.section}</div>`;
    if (spec.title) h += `<div class="title">${spec.title}</div>`;
    h += spec.html || '';
    if (spec.kind !== 'title' && spec.kind !== 'section-card') h += `<div class="pagenum">${spec.label}${window.SHOW_IDS ? ' · ' + spec.id : ''}</div>`;
    el.innerHTML = h;
    host.appendChild(el);
    spec.el = el;
    if (spec.init) { try { spec.init(el, D.lib, spec); } catch (e) { console.error('init failed in slide ' + spec.id + ': ' + e.message); fail(el, e); } }
    el.querySelectorAll('.draw').forEach(n => n.setAttribute('pathLength', '1'));
    return el;
  }

  function fail(el, e) { const d = document.createElement('div'); d.className = 'abs'; d.style.cssText = 'left:120px;top:960px;font-size:24px;color:#B9463F;z-index:5'; d.textContent = 'slide error: ' + e.message; el.appendChild(d); }
  function safeDraw(spec, s) { try { spec.draw(spec.el, s, D.lib); } catch (e) { if (!spec._drawErr) { spec._drawErr = 1; console.error('draw failed in slide ' + spec.id + ': ' + e.message); } } }

  function visibility(el, k) {
    el.querySelectorAll('[data-in],[data-out],[data-dim]').forEach(n => {
      const i = n.dataset.in !== undefined ? +n.dataset.in : -Infinity;
      const o = n.dataset.out !== undefined ? +n.dataset.out : Infinity;
      const d = n.dataset.dim !== undefined ? +n.dataset.dim : Infinity;
      const u = n.dataset.undim !== undefined ? +n.dataset.undim : Infinity;
      const hidden = k < i || k >= o;
      n.classList.toggle('is-hidden', hidden);
      n.classList.toggle('is-dim', !hidden && k >= d && k < u);
    });
  }

  function stateOf(spec, k) { return spec.state ? spec.state(Math.max(0, k)) : Math.max(0, k); }

  // instant: set click k with no transition
  function setInstant(spec, k) {
    const el = spec.el;
    el.classList.add('instant');
    visibility(el, k);
    if (spec.draw) safeDraw(spec, stateOf(spec, k));
    void el.offsetWidth;
    el.classList.remove('instant');
  }

  // animated: from the current click to click k (k = step + 1)
  function animateTo(spec, k) {
    const el = spec.el, tok = { skip: false, spec };
    D.busy = tok;
    visibility(el, k);
    const jobs = [];
    if (spec.draw && spec.state && k >= 1) {
      const a = spec.state(k - 1), b = spec.state(k);
      const ms = spec.dur ? spec.dur(k) : 900;
      jobs.push(D.tween(ms, e => safeDraw(spec, lerp(a, b, e)), tok));
    }
    if (spec.play) { try { jobs.push(Promise.resolve(spec.play(k, el, D.lib, tok)).catch(e => console.error('play failed in ' + spec.id + ': ' + e.message))); } catch (e) { console.error('play failed in ' + spec.id + ': ' + e.message); } }
    jobs.push(D.wait(k === 0 ? 450 : 380, tok)); // let CSS fades finish before the next click counts
    tok.done = Promise.all(jobs).then(() => { if (D.busy === tok) D.busy = null; });
    return tok.done;
  }

  let liveStop = null;
  function stopLive() { if (liveStop) { try { liveStop(); } catch (e) {} liveStop = null; } }
  function startLive(spec, k) { stopLive(); if (spec.live) { try { liveStop = spec.live(k, spec.el, D.lib) || null; } catch (e) { console.error('live failed in ' + spec.id + ': ' + e.message); } } }

  // ---------- navigation ----------
  function show(i) {
    D.slides.forEach((s, j) => s.el.classList.toggle('current', j === i));
  }
  function updateHash() { history.replaceState(null, '', '#' + (D.cur + 1) + (D.step ? '.' + D.step : '')); renderScript(); }

  D.go = function (i, k, animate) {
    i = Math.max(0, Math.min(D.slides.length - 1, i));
    const spec = D.slides[i];
    k = Math.max(0, Math.min(spec.steps || 0, k));
    stopLive();
    const prev = D.busy;
    if (prev) { prev.skip = true; prev.dead = true; }
    const changed = i !== D.cur || !spec.el.classList.contains('current');
    D.cur = i; D.step = k;
    if (changed) show(i);
    updateHash();
    if (animate === 'enter') {
      setInstant(spec, -1);
      return animateTo(spec, 0).then(() => startLive(spec, 0));
    }
    if (animate) return animateTo(spec, k).then(() => { if (D.cur === i && D.step === k) startLive(spec, k); });
    setInstant(spec, k);
    startLive(spec, k);
    if (prev && prev.spec === spec && prev.done)   // a play() may still set styles as it unwinds
      prev.done.then(() => { if (D.cur === i && D.step === k && !D.busy) { stopLive(); setInstant(spec, k); startLive(spec, k); } });
    return Promise.resolve();
  };
  D.next = function () {
    if (D.busy) { D.busy.skip = true; return; }
    const s = D.slides[D.cur];
    if (D.step < (s.steps || 0)) D.go(D.cur, D.step + 1, true);
    else if (D.cur < D.slides.length - 1) D.go(D.cur + 1, 0, 'enter');
  };
  D.prev = function () {
    if (D.busy) D.busy.skip = true;
    if (D.step > 0) D.go(D.cur, D.step - 1, false);
    else if (D.cur > 0) D.go(D.cur - 1, D.slides[D.cur - 1].steps || 0, false);
  };
  D.lastMain = () => { let j = 0; D.slides.forEach((s, i) => { if (!s.backup) j = i; }); return j; };

  // ---------- overview ----------
  let ovBuilt = false;
  function buildOverview() {
    const ov = $('#overview'); ov.innerHTML = '<div class="grid"></div>';
    const grid = ov.firstChild; let inBackup = false;
    D.slides.forEach((s, i) => {
      if (s.backup && !inBackup) { inBackup = true; const sep = document.createElement('div'); sep.className = 'sep'; sep.textContent = 'Backup'; grid.appendChild(sep); }
      const th = document.createElement('div'); th.className = 'thumb'; th.dataset.i = i;
      const inner = document.createElement('div'); inner.className = 'inner';
      setInstant(s, s.steps || 0);
      const c = s.el.cloneNode(true); c.classList.add('current'); inner.appendChild(c);
      th.appendChild(inner);
      const cap = document.createElement('div'); cap.className = 'ov-cap'; cap.textContent = s.label + '  ' + (s.name || s.title || (s.kind === 'title' ? 'Title' : s.id)).replace(/<[^>]+>/g, '').replace(/\\\(|\\\)/g, '').replace(/\\neq/g, '≠').replace(/\\[a-zA-Z]+/g, '').replace(/[{}^_]/g, '').slice(0, 42);
      th.appendChild(cap);
      th.onclick = () => { toggleOverview(false); D.go(i, 0, 'enter'); };
      grid.appendChild(th);
    });
    setInstant(D.slides[D.cur], D.step);
    requestAnimationFrame(() => grid.querySelectorAll('.thumb').forEach(t => { t.firstChild.style.transform = `scale(${t.clientWidth / W})`; }));
    ovBuilt = true;
  }
  function toggleOverview(on) {
    const ov = $('#overview');
    on = on === undefined ? !ov.classList.contains('on') : on;
    if (on && !ovBuilt) buildOverview();
    ov.classList.toggle('on', on);
    if (on) { ov.querySelectorAll('.thumb').forEach(t => t.classList.toggle('cur', +t.dataset.i === D.cur)); const c = ov.querySelector('.thumb.cur'); if (c) c.scrollIntoView({ block: 'center' }); }
  }

  // ---------- scaling ----------
  function fit() {
    const v = $('#viewport'), w = v.clientWidth || innerWidth, h = v.clientHeight || innerHeight;
    const s = Math.min(w / W, h / H);
    $('#stage').style.transform = `scale(${s})`;
  }

  

  function notesOf(spec) { const n = spec.notes; return !n ? [] : Array.isArray(n) ? n : [n]; }
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // Notes can come from shared suggestions. Keep speaking cues, never active HTML.
  function noteHTML(value) {
    const input = document.createElement('template'), output = document.createElement('div');
    input.innerHTML = String(value ?? '');
    const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'SUB', 'SUP']);
    const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE']);
    function append(source, target) {
      for (const node of source.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) target.appendChild(document.createTextNode(node.nodeValue));
        else if (node.nodeType === Node.ELEMENT_NODE && !blocked.has(node.tagName)) {
          if (allowed.has(node.tagName)) {
            const clean = document.createElement(node.tagName.toLowerCase());
            append(node, clean); target.appendChild(clean);
          } else append(node, target);
        }
      }
    }
    append(input.content, output);
    return output.innerHTML;
  }
   
  const EKEY = 'deck-script-edits:' + location.pathname;
  function loadEdits() { try { return JSON.parse(localStorage.getItem(EKEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveEdits(ed) { try { localStorage.setItem(EKEY, JSON.stringify(ed)); } catch (e) {} }
  function notesShown(spec) {   // the deck's notes with this browser's edits on top
    const nt = notesOf(spec).slice(), ed = loadEdits()[spec.id] || {};
    Object.keys(ed).forEach(k => { nt[+k] = ed[k]; });
    return nt;
  }
  function editCount() { const ed = loadEdits(); return Object.values(ed).reduce((n, o) => n + Object.keys(o).length, 0); }
  function exportEdits() {
    const ed = loadEdits(), lines = ['# Script edits from ' + (location.pathname.split('/').pop() || 'index.html') + ', ' + new Date().toISOString().slice(0, 16).replace('T', ' '), ''];
    D.slides.forEach(s => {
      const e = ed[s.id]; if (!e) return; const o = notesOf(s);
      Object.keys(e).sort((a, b) => a - b).forEach(k => {
        lines.push('## ' + s.id + ' click ' + k + ' (slide ' + (s.label || '') + ')', '', '### new', e[k], '', '### old', o[+k] || '', '');
      });
    });
    return lines.join('\n');
  }
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  let curEdit = null;   // the note being edited: saved before any re-render, so a slide change never loses it
  // ---------- link a file (Chrome): every saved edit is also written there, so the lead can read it ----------
  let fileHandle = null, fileState = '';   // fileState: '' (none), 'ok', 'needs-click', 'error'
  function idb(mode, fn) {
    return new Promise((res, rej) => {
      const r = indexedDB.open('deck-script-file', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('h');
      r.onsuccess = () => { const tx = r.result.transaction('h', mode), st = tx.objectStore('h'), q = fn(st); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); };
      r.onerror = () => rej(r.error);
    });
  }
  function fileText() {
    return exportEdits() + '\n\n<!-- raw edits, keyed by slide id and click; written by the deck -->\n```json\n' + JSON.stringify(loadEdits(), null, 1) + '\n```\n';
  }
  async function writeFile(gesture) {
    if (!fileHandle) return;
    try {
      let perm = await fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && gesture) perm = await fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { fileState = 'needs-click'; renderScriptBar(); return; }
      const w = await fileHandle.createWritable(); await w.write(fileText()); await w.close();
      fileState = 'ok:' + new Date().toTimeString().slice(0, 5);
    } catch (e) { fileState = 'error'; }
    renderScriptBar();
  }
  async function linkFile() {
    try {
      fileHandle = await window.showSaveFilePicker({ suggestedName: 'SCRIPT_EDITS.md', types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] });
      try { await idb('readwrite', st => st.put(fileHandle, 'h')); } catch (e) {}
      await writeFile(true);
    } catch (e) { /* cancelled */ }
  }
  if (window.showSaveFilePicker && window.indexedDB) {
    idb('readonly', st => st.get('h')).then(h => { if (h) { fileHandle = h; fileState = 'needs-click'; writeFile(false); } }).catch(() => {});
  }
  function fileBar() {
    if (!window.showSaveFilePicker) return '';
    if (!fileHandle) return '<button data-x="link" title="Pick a file once; every saved edit is then written there">Link edits file</button>';
    const name = escapeText(fileHandle.name || 'file');
    if (fileState.startsWith('ok')) return `<span class="lk">Linked: ${name} · synced ${fileState.slice(3)}</span>`;
    if (fileState === 'error') return `<button data-x="sync">Retry writing ${name}</button>`;
    return `<button data-x="sync">Sync edits to ${name}</button>`;
  }
  function renderScriptBar() { const b = document.querySelector('#script .ex .fb'); if (b) b.innerHTML = fileBar(); }
  

  function clickOffset(div, e) {
    if (!e) return null;
    let node = null, off = 0;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) { node = r.startContainer; off = r.startOffset; } }
    else if (document.caretPositionFromPoint) { const r = document.caretPositionFromPoint(e.clientX, e.clientY); if (r) { node = r.offsetNode; off = r.offset; } }
    if (!node || node.nodeType !== 3 || !div.contains(node)) return null;
    const k = div.querySelector('.k'); if (k && k.contains(node)) return 0;
    const w = document.createTreeWalker(div, NodeFilter.SHOW_TEXT); let n = 0;
    for (let t = w.nextNode(); t; t = w.nextNode()) { if (k && k.contains(t)) continue; if (t === node) return n + off; n += t.nodeValue.length; }
    return null;
  }
  function rawIndex(raw, vis) {
    let i = 0, n = 0;
    while (i < raw.length && n < vis) {
      if (raw[i] === '<') { const j = raw.indexOf('>', i); if (j < 0) break; i = j + 1; continue; }
      if (raw[i] === '&') { const m = /^&[#a-zA-Z0-9]+;/.exec(raw.slice(i, i + 12)); if (m) { i += m[0].length; n++; continue; } }
      i++; n++;
    }
    return i;
  }
  function startEdit(div, ev) {
    if (div.querySelector('textarea')) return;
    const s = D.slides[D.cur], i = +div.dataset.i, raw = notesShown(s)[i] || '';
    const at = clickOffset(div, ev);
    const ta = document.createElement('textarea'); ta.value = raw; ta.spellcheck = true;
    div.innerHTML = `<span class="k">${i === 0 ? 'on entry' : 'click ' + i} · editing — click outside or press ⌘↵ to save, Esc to cancel</span>`;
    div.appendChild(ta);
    const fitTa = () => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 4) + 'px'; };
    const before = (loadEdits()[s.id] || {})[i];   // this note's saved edit before this edit began (Esc puts it back)
    const store = v => {   // keep the note as typed, in this browser (on every keystroke, so a reload or a closed tab loses nothing)
      const ed = loadEdits(), orig = notesOf(s)[i] || '';
      ed[s.id] = ed[s.id] || {};
      if (v === undefined || v === orig) delete ed[s.id][i]; else ed[s.id][i] = v;
      if (!Object.keys(ed[s.id]).length) delete ed[s.id];
      saveEdits(ed);
    };
    let saveT = null, last = ta.value;
    fitTa(); ta.addEventListener('input', () => { last = ta.value; fitTa(); clearTimeout(saveT); saveT = setTimeout(() => store(ta.value), 300); }); ta.focus();
    if (at != null) { const ix = rawIndex(raw, at); ta.setSelectionRange(ix, ix); }
    

    const poll = setInterval(() => { if (ta.value !== last) { last = ta.value; fitTa(); store(ta.value); } }, 500);
    let done = false;
    const finish = (save, quiet) => {
      if (done) return; done = true; curEdit = null; clearTimeout(saveT); clearInterval(poll);
      document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', steer, true); window.removeEventListener('focus', back);
      if (save) { store(ta.value); writeFile(false); } else store(before);
      if (!quiet) renderScript();
    };
    curEdit = finish;
    

    const outside = e => { if (done) return; if (e.target === ta) return; finish(true); };
    const steer = e => {
      if (done) return;
      const a = document.activeElement;
      if (a === ta) return;
      if (a && a !== document.body && a.closest && a.closest('textarea, input, [contenteditable="true"]')) return;   // another field
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(false); return; }
      ta.focus(); e.stopImmediatePropagation();                       // the key's own text (or a Cmd+V paste) now lands in the box
    };
    const back = () => { if (!done && (document.activeElement === document.body || !document.activeElement)) ta.focus(); };
    document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', steer, true); window.addEventListener('focus', back);
    ta.addEventListener('blur', () => { if (!done) store(ta.value); });
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
    });
  }
  function renderScript() {
    if (curEdit) curEdit(true, true);
    const p = $('#script'); if (!p || !p.classList.contains('on')) return;
    const s = D.slides[D.cur], nt = notesShown(s), nxt = D.slides[D.cur + 1], mine = loadEdits()[s.id] || {};
    const title = (s.name || s.title || (s.kind === 'title' ? 'Title' : s.id) || '').replace(/<[^>]+>/g, '');
    let h = `<div class="sh">slide ${escapeText(s.label || '')} · ${escapeText(s.id)} · click ${D.step} of ${s.steps || 0}</div><div class="st">${escapeText(title)}</div>`;
    if (!nt.length) h += '<div class="none">No script for this slide yet.</div>';
    const ci = Math.min(D.step, Math.max(nt.length - 1, 0));     // every block shown; all but the current click's are faded
    nt.forEach((t, i) => { const e = i in mine; h += `<div class="sn${i === ci ? ' cur' : ''}${e ? ' ed' : ''}" data-i="${i}" title="Click to edit"><span class="k">${i === 0 ? 'on entry' : 'click ' + i}${e ? ' · <b>edited</b> <a class="rv" data-i="' + i + '">undo</a>' : ''}</span>${noteHTML(t)}</div>`; });
    if (nxt) h += `<div class="nx">next: ${escapeText((nxt.name || nxt.title || nxt.id || '').replace(/<[^>]+>/g, ''))}</div>`;
    const n = editCount();
    const editHelp = window.DECK_COLLABORATION === true
      ? 'Edits are saved in this browser and sent to the author. The author applies and republishes them for everyone.'
      : 'These edits stay in this browser. To change the deck, edit SCRIPT.md or export your edits for the author.';
    h += `<div class="ex">Click any note to edit it. ${editHelp}<br><button data-x="export"${n ? '' : ' disabled'}>Export edits (${n})</button> <button data-x="copy"${n ? '' : ' disabled'}>Copy</button> <button data-x="clear"${n ? '' : ' disabled'}>Clear all</button><div class="fb">${fileBar()}</div></div>`;
    const prevTop = p.scrollTop, sameSlide = p.dataset.slide === String(D.cur);
    p.innerHTML = h; p.dataset.slide = String(D.cur);
    // teleprompter: the current note glides up to a fixed reading line near the top of the panel
    const cur = p.querySelector('.sn.cur');
    if (cur) {
      const top = Math.max(0, cur.offsetTop - 96);
      if (sameSlide) { p.scrollTop = prevTop; p.scrollTo({ top, behavior: 'smooth' }); } else p.scrollTop = top;
    }
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([p]).catch(() => {});
  }
  function toggleScript(on) {
    const p = $('#script'); on = on === undefined ? !p.classList.contains('on') : on;
    p.classList.toggle('on', on); document.body.classList.toggle('script-on', on);
    const b = $('#bar [data-a="script"]'); if (b) b.classList.toggle('act', on);
    fit(); renderScript();
  }
  function buildBar() {
    const bar = document.createElement('div'); bar.id = 'bar';
    bar.innerHTML = '<button data-a="slides">Slides</button><button data-a="script">Script</button><button data-a="full">Full screen</button>';
    document.body.appendChild(bar);
    const sc = document.createElement('div'); sc.id = 'script'; document.body.appendChild(sc);
    sc.addEventListener('click', e => {
      e.stopPropagation();
      const rv = e.target.closest('a.rv'), x = e.target.closest('button[data-x]'), sn = e.target.closest('.sn');
      if (rv) { const ed = loadEdits(), id = D.slides[D.cur].id; if (ed[id]) { delete ed[id][rv.dataset.i]; if (!Object.keys(ed[id]).length) delete ed[id]; saveEdits(ed); writeFile(true); } renderScript(); return; }
      if (x) {
        const a = x.dataset.x, txt = exportEdits();
        if (a === 'export') download('script_edits_' + new Date().toISOString().slice(0, 10) + '.md', txt);
        if (a === 'copy' && navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { x.textContent = 'Copied'; setTimeout(renderScript, 1200); }).catch(() => {});
        if (a === 'clear' && confirm('Discard all script edits saved in this browser?')) { saveEdits({}); writeFile(true); renderScript(); }
        if (a === 'link') linkFile();
        if (a === 'sync') writeFile(true);
        return;
      }
      if (sn && !e.target.closest('textarea')) startEdit(sn, e);
    });
    bar.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; e.stopPropagation();
      if (a === 'slides') toggleOverview(); if (a === 'script') toggleScript();
      if (a === 'full') { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } });
    let hideT = null;
    addEventListener('mousemove', e => {
      const near = e.clientY >= innerHeight - 22, over = bar.matches(':hover');
      if (near || over) { clearTimeout(hideT); bar.classList.add('on'); }
      else if (bar.classList.contains('on') && !hideT) { hideT = setTimeout(() => { bar.classList.remove('on'); hideT = null; }, 500); }
    });
    document.addEventListener('mouseleave', () => bar.classList.remove('on'));
  }

  // ---------- keyboard / mouse ----------
  let jumpBuf = '';
  function jumpShow() { const j = $('#jump'); j.style.display = jumpBuf ? 'block' : 'none'; j.textContent = 'go to ' + jumpBuf; }
  function onKey(e) {
    if (e.target && e.target.closest && e.target.closest('textarea, input, [contenteditable="true"]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { jumpBuf += k; jumpShow(); return; }
    if (k === 'Enter' && jumpBuf) { const n = parseInt(jumpBuf, 10); jumpBuf = ''; jumpShow(); toggleOverview(false); D.go(n - 1, 0, 'enter'); return; }
    if (k === 'Escape') { jumpBuf = ''; jumpShow(); toggleOverview(false); $('#blank').classList.remove('on'); return; }
    if ($('#overview').classList.contains('on') && k !== 'g' && k !== 'G') return;
    if ((k === 'ArrowRight' || k === 'ArrowDown') && e.shiftKey) { D.go(D.cur + 1, 0, 'enter'); e.preventDefault(); return; }
    if ((k === 'ArrowLeft' || k === 'ArrowUp') && e.shiftKey) { D.go(D.cur - 1, 0, false); e.preventDefault(); return; }
    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': case 'n': D.next(); e.preventDefault(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': case 'p': D.prev(); e.preventDefault(); break;
      case 'Home': D.go(0, 0, false); break;
      case 'End': D.go(D.lastMain(), D.slides[D.lastMain()].steps || 0, false); break;
      case 'g': case 'G': toggleOverview(); break;
      case 'b': case 'B': $('#blank').classList.toggle('on'); break;
      case 's': case 'S': toggleScript(); break;
      case 'f': case 'F': if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); break;
    }
  }

  // ---------- print (?print, ?print=steps) ----------
  function buildPrint(steps) {
    document.body.classList.add('print');
    const host = $('#viewport');
    D.slides.forEach(s => {
      const ks = steps ? [...Array((s.steps || 0) + 1).keys()] : [s.steps || 0];
      ks.forEach(k => {
        setInstant(s, k);
        const page = document.createElement('div'); page.className = 'page';
        const c = s.el.cloneNode(true); c.classList.add('current'); page.appendChild(c); host.appendChild(page);
      });
    });
  }

  // ---------- boot ----------
  function loadScripts(files) {
    return files.reduce((p, f) => p.then(() => new Promise((res) => {
      const sc = document.createElement('script'); sc.src = f; sc.onload = res;
      sc.onerror = () => { console.info('not yet written: ' + f); res(); };
      document.head.appendChild(sc);
    })), Promise.resolve());
  }
  D.boot = function (files) {
    loadScripts(files).then(() => {
      const stage = $('#stage');
      let m = 0, b = 0;
      D.slides.forEach(s => { s.label = s.backup ? (s.kind === 'section-card' ? '' : 'B' + (++b)) : String(++m); });
      D.slides.forEach((s, i) => mount(s, stage, i));
      const mj = window.MathJax && MathJax.typesetPromise ? MathJax.typesetPromise([stage]) : Promise.resolve();
      return mj.catch(e => console.error(e)).then(() => document.fonts ? document.fonts.ready : null);
    }).then(() => {
      D.slides.forEach(s => { if (s.after) { try { s.after(s.el, D.lib); } catch (e) { console.error('after failed in ' + s.id + ': ' + e.message); } } });   // after MathJax: measure labels if needed
      const q = new URLSearchParams(location.search);
      if (q.has('print')) { buildPrint(q.get('print') === 'steps'); D.ready = true; document.body.dataset.ready = '1'; return; }
      buildBar(); fit(); addEventListener('resize', fit);
      addEventListener('keydown', onKey);
      

      const liveLink = t => {
        const a = t && t.closest && t.closest('a[href]'); if (!a) return null;
        for (let n = a; n && n.id !== 'stage'; n = n.parentElement) if (+getComputedStyle(n).opacity < 0.5) return null;
        return a;
      };
      $('#stage').addEventListener('click', e => {
        if (e.button !== 0) return;
        const a = liveLink(e.target);
        if (a) { setTimeout(() => a.blur(), 0); return; }
        e.preventDefault(); D.next();
      });
      $('#stage').addEventListener('contextmenu', e => { e.preventDefault(); D.prev(); });
      const h = location.hash.replace('#', '').split('.');
      const i = h[0] ? parseInt(h[0], 10) - 1 : 0, k = h[1] ? parseInt(h[1], 10) : 0;
      D.go(isNaN(i) ? 0 : i, isNaN(k) ? 0 : k, false);
      D.ready = true; document.body.dataset.ready = '1';
    });
  };
})();
