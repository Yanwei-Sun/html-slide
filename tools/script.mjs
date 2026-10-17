#!/usr/bin/env node
// Export, apply and watch speaker notes without replacing unrelated slide text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function literal(node, label) {
  if (node?.type === 'Literal') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  throw new Error(`${label} must be a literal; keep speaker notes as strings in an array.`);
}

function property(object, name) {
  return object.properties.find(p => p.type === 'Property' && !p.computed && (p.key.name || p.key.value) === name)?.value;
}

function slidePath(deck, filename) {
  const root = fs.realpathSync(deck), slides = fs.realpathSync(path.join(root, 'slides'));
  const inside = (base, file) => {
    const relative = path.relative(base, file);
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
  };
  if (!inside(root, slides)) throw new Error('The slides folder leaves the selected deck through a symlink.');
  const candidate = path.resolve(slides, filename);
  if (!inside(slides, candidate)) throw new Error('Slide filename leaves the slides folder.');
  const real = fs.realpathSync(candidate);
  if (!inside(slides, real)) throw new Error('A slide symlink leaves the selected slides folder.');
  return real;
}

function orderOf(deck) {
  const source = fs.readFileSync(slidePath(deck, 'order.js'), 'utf8');
  const orders = [];
  walk(parse(source, { ecmaVersion: 'latest' }), node => {
    if (node.type !== 'AssignmentExpression' || node.operator !== '=') return;
    const target = node.left;
    if (target.type === 'MemberExpression' && target.object.name === 'window' && target.property.name === 'ORDER' && !target.computed) orders.push(node.right);
  });
  if (orders.length !== 1 || orders[0].type !== 'ArrayExpression') throw new Error('slides/order.js must assign one literal array to window.ORDER.');
  return orders[0].elements.map(node => {
    const filename = literal(node, 'Slide filename');
    if (typeof filename !== 'string' || !filename.endsWith('.js')) throw new Error('Slide filenames must be JavaScript files.');
    const resolved = path.resolve(deck, 'slides', filename);
    if (!resolved.startsWith(path.resolve(deck, 'slides') + path.sep)) throw new Error('Slide filename leaves the slides folder.');
    return filename;
  });
}

function specsOf(source, file) {
  const specs = [];
  walk(parse(source, { ecmaVersion: 'latest' }), node => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return;
    const call = node.callee;
    if (call.object.name !== 'Deck' || call.computed || !['slide', 'sectionCard'].includes(call.property.name)) return;
    const object = node.arguments[0];
    if (object?.type !== 'ObjectExpression') throw new Error(`${file}: slide registration must use an object literal.`);
    const sid = literal(property(object, 'id'), `${file}: slide id`);
    if (typeof sid !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sid)) throw new Error(`${file}: invalid slide id.`);
    const titleNode = property(object, 'name') || property(object, 'title');
    let title = sid;
    if (titleNode?.type === 'Literal' || (titleNode?.type === 'TemplateLiteral' && !titleNode.expressions.length)) title = String(literal(titleNode, 'Title'));
    const notesNode = property(object, 'notes');
    const nodes = !notesNode ? [] : notesNode.type === 'ArrayExpression' ? notesNode.elements : [notesNode];
    const notes = nodes.map((note, k) => {
      const text = literal(note, `${file}: ${sid} click ${k}`);
      if (typeof text !== 'string') throw new Error(`${file}: ${sid} click ${k} is not a string.`);
      return { text, start: note.start, end: note.end };
    });
    specs.push({ sid, title: title.replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, ' '), notes });
  });
  return specs;
}

/** Read ordered notes and their precise source ranges; no slide code is executed. */
export function readDeckNotes(deckDir = path.join(ROOT, 'deck')) {
  const deck = path.resolve(deckDir);
  const slides = [], ids = new Set();
  for (const file of orderOf(deck)) {
    const filename = slidePath(deck, file);
    const source = fs.readFileSync(filename, 'utf8');
    for (const spec of specsOf(source, file)) {
      if (ids.has(spec.sid)) throw new Error(`Duplicate slide id: ${spec.sid}`);
      ids.add(spec.sid);
      slides.push({ ...spec, file, filename, source, n: slides.length + 1 });
    }
  }
  return slides;
}

/** Apply a reviewed batch with optimistic concurrency checks; conflicts leave every file untouched. */
export function applyNoteEdits(deckDir, edits, { dryRun = false } = {}) {
  const result = { applied: [], already: [], conflicts: [] };
  const slides = new Map(readDeckNotes(deckDir).map(slide => [slide.sid, slide]));
  const pending = new Map(), keys = new Set();
  for (const edit of edits) {
    const sid = edit.sid, k = edit.k, key = `${sid}.${k}`;
    const conflict = reason => result.conflicts.push({ sid, k, reason });
    if (keys.has(key)) { conflict('The batch edits the same note twice.'); continue; }
    keys.add(key);
    const slide = slides.get(sid);
    if (!slide || !Number.isInteger(k) || k < 0 || !slide.notes[k]) { conflict('The slide or click note does not exist.'); continue; }
    if (typeof edit.orig !== 'string' || typeof edit.text !== 'string') { conflict('Both original and replacement notes must be strings.'); continue; }
    const note = slide.notes[k], detail = { sid, k, file: slide.file };
    if (note.text === edit.text) { result.already.push(detail); continue; }
    if (note.text !== edit.orig) { conflict('The slide note changed since this edit began; review it before applying.'); continue; }
    if (!pending.has(slide.filename)) pending.set(slide.filename, { source: slide.source, edits: [] });
    pending.get(slide.filename).edits.push({ start: note.start, end: note.end, text: JSON.stringify(edit.text), sid, k, expected: edit.text });
    result.applied.push(detail);
  }
  if (result.conflicts.length) { result.applied = []; return result; }
  for (const [filename, change] of pending) {
    change.output = change.source;
    for (const edit of change.edits.sort((a, b) => b.start - a.start)) change.output = change.output.slice(0, edit.start) + edit.text + change.output.slice(edit.end);
    const checked = new Map(specsOf(change.output, path.basename(filename)).map(slide => [slide.sid, slide]));
    for (const edit of change.edits) if (checked.get(edit.sid)?.notes[edit.k]?.text !== edit.expected) throw new Error('Replacement failed its parse and read-back check.');
    if (fs.readFileSync(filename, 'utf8') !== change.source) result.conflicts.push({ reason: `${path.basename(filename)} changed during application; retry.` });
  }
  if (result.conflicts.length) { result.applied = []; return result; }
  if (dryRun || !pending.size) return result;
  // Prepare all files before renaming any. Original contents stay in memory for rollback.
  const committed = [];
  try {
    for (const [filename, change] of pending) {
      change.temp = `${filename}.notes-${process.pid}-${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(change.temp, change.output, { flag: 'wx', mode: fs.statSync(filename).mode });
    }
    for (const [filename, change] of pending) {
      if (fs.readFileSync(filename, 'utf8') !== change.source) throw new Error(`${path.basename(filename)} changed during application; retry.`);
      fs.renameSync(change.temp, filename); committed.push(filename);
    }
  } catch (error) {
    for (const filename of committed) fs.writeFileSync(filename, pending.get(filename).source);
    throw error;
  } finally {
    for (const change of pending.values()) if (change.temp && fs.existsSync(change.temp)) fs.unlinkSync(change.temp);
  }
  return result;
}

function renderScript(slides) {
  const lines = [
    '# Talk script', '',
    'Edit the text between each pair of `slide-note` markers, then run `npm run script:apply`.',
    'Click 0 means the note on entry. Keep the headings and markers. `<b>...</b>` adds a bold cue.',
    'Use `npm run script:watch` to apply saved changes while you edit. Reload the deck to see them.', '',
    '<!-- Base hashes prevent an old script from overwriting newer slide notes. -->', ''
  ];
  for (const slide of slides) {
    lines.push(`## ${slide.n} · ${slide.title} (${slide.sid})`, '');
    slide.notes.forEach((note, k) => {
      lines.push(`### ${slide.sid}.${k} · ${k === 0 ? 'on entry' : 'click ' + k}`,
        `<!-- slide-note ${JSON.stringify({ sid: slide.sid, k, base: digest(note.text) })} -->`,
        note.text, '<!-- /slide-note -->', '');
    });
  }
  return lines.join('\n');
}

function parseScript(markdown) {
  const blocks = [], seen = new Set();
  const pattern = /^<!-- slide-note (\{[^\n]+\}) -->\r?\n([\s\S]*?)\r?\n<!-- \/slide-note -->\s*$/gm;
  let match;
  while ((match = pattern.exec(markdown))) {
    const meta = JSON.parse(match[1]);
    if (typeof meta.sid !== 'string' || !Number.isInteger(meta.k) || meta.k < 0 || !/^[a-f0-9]{64}$/.test(meta.base)) throw new Error('A slide-note marker has invalid metadata.');
    const key = `${meta.sid}.${meta.k}`;
    if (seen.has(key)) throw new Error(`Duplicate note block: ${key}`);
    seen.add(key);
    blocks.push({ ...meta, text: match[2].replace(/\r\n/g, '\n'), full: match[0], marker: match[0].slice(0, match[0].indexOf('\n')).replace(/\r$/, '') });
  }
  const openings = markdown.match(/^<!-- slide-note /gm)?.length || 0;
  const closings = markdown.match(/^<!-- \/slide-note -->/gm)?.length || 0;
  if (openings !== blocks.length || closings !== blocks.length) throw new Error('A note marker is missing, incomplete or nested. Finish saving and try again.');
  return blocks;
}

/** Bring unchanged SCRIPT blocks up to date while preserving any pending local edits. */
export function refreshScript(deckDir, scriptPath = path.join(ROOT, 'SCRIPT.md')) {
  const slides = readDeckNotes(deckDir);
  if (!fs.existsSync(scriptPath)) {
    atomicWrite(scriptPath, renderScript(slides));
    return { refreshed: slides.reduce((total, slide) => total + slide.notes.length, 0), preserved: 0 };
  }
  const markdown = fs.readFileSync(scriptPath, 'utf8'), blocks = parseScript(markdown);
  const expected = new Map();
  for (const slide of slides) slide.notes.forEach((note, k) => expected.set(`${slide.sid}.${k}`, note.text));
  if (blocks.length !== expected.size || blocks.some(block => !expected.has(`${block.sid}.${block.k}`))) throw new Error('SCRIPT.md has a different set of note markers; save pending edits before exporting again.');
  let updated = markdown, refreshed = 0, preserved = 0;
  for (const block of blocks) {
    const text = expected.get(`${block.sid}.${block.k}`);
    if (digest(block.text) !== block.base && block.text !== text) { preserved++; continue; }
    const marker = `<!-- slide-note ${JSON.stringify({ sid: block.sid, k: block.k, base: digest(text) })} -->`;
    const suffix = block.full.slice(block.full.indexOf('<!-- /slide-note -->') + '<!-- /slide-note -->'.length);
    const next = `${marker}\n${text}\n<!-- /slide-note -->${suffix}`;
    if (next !== block.full) { updated = updated.replace(block.full, () => next); refreshed++; }
  }
  if (updated !== markdown) {
    if (fs.readFileSync(scriptPath, 'utf8') !== markdown) throw new Error('SCRIPT.md was saved again during refresh. Retry; your save was preserved.');
    atomicWrite(scriptPath, updated);
  }
  return { refreshed, preserved };
}

function applyScript(deck, script, { dryRun = false } = {}) {
  const markdown = fs.readFileSync(script, 'utf8');
  const blocks = parseScript(markdown);
  const slides = readDeckNotes(deck), expected = new Map();
  for (const slide of slides) slide.notes.forEach((note, k) => expected.set(`${slide.sid}.${k}`, { ...note, sid: slide.sid, k }));
  if (blocks.length !== expected.size || blocks.some(block => !expected.has(`${block.sid}.${block.k}`))) throw new Error('SCRIPT.md does not contain exactly the current deck’s note blocks. Restore the markers or export again with --force after saving your edits.');
  const edits = [], successful = [];
  for (const block of blocks) {
    const current = expected.get(`${block.sid}.${block.k}`);
    if (digest(block.text) === block.base) continue;
    if (current.text !== block.text && digest(current.text) !== block.base) throw new Error(`${block.sid}.${block.k}: the slide changed after this script was exported. Review both versions; nothing was applied.`);
    edits.push({ sid: block.sid, k: block.k, orig: current.text, text: block.text });
    successful.push(block);
  }
  const result = applyNoteEdits(deck, edits, { dryRun });
  if (result.conflicts.length) throw new Error(result.conflicts.map(item => `${item.sid || ''}.${item.k ?? ''}: ${item.reason}`).join('\n'));
  if (!dryRun && successful.length) {
    let updated = markdown;
    for (const block of successful) updated = updated.replace(block.marker, () => `<!-- slide-note ${JSON.stringify({ sid: block.sid, k: block.k, base: digest(block.text) })} -->`);
    // Never overwrite another save that happened while the slide files were updated.
    if (fs.readFileSync(script, 'utf8') === markdown) atomicWrite(script, updated);
    else console.warn('SCRIPT.md was saved again while applying. The deck was updated; run apply again to refresh the base hashes.');
  }
  if (!dryRun) refreshScript(deck, script);
  return result;
}

function atomicWrite(filename, contents) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.notes-${process.pid}.tmp`;
  try { fs.writeFileSync(temporary, contents, { flag: 'wx' }); fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function options(argv) {
  const opts = { command: argv.shift() || 'help', deck: path.join(ROOT, 'deck'), script: path.join(ROOT, 'SCRIPT.md'), interval: 500 };
  while (argv.length) {
    const flag = argv.shift();
    if (['--force', '--dry-run', '--once'].includes(flag)) opts[flag.slice(2).replace('-', '')] = true;
    else if (['--deck', '--script', '--interval'].includes(flag)) {
      const value = argv.shift();
      if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value.`);
      opts[flag.slice(2)] = flag === '--interval' ? Number(value) : path.resolve(ROOT, value);
    } else if (flag === '--help' || flag === '-h') opts.command = 'help';
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (!Number.isFinite(opts.interval) || opts.interval < 100) throw new Error('--interval must be at least 100 milliseconds.');
  return opts;
}

async function main() {
  const opts = options(process.argv.slice(2));
  if (['help', '--help', '-h'].includes(opts.command)) {
    console.log(`Speaker notes: node tools/script.mjs export|apply|watch [options]
  --deck DIR       deck folder (default: deck, relative to the repo)
  --script FILE    editable notes file (default: SCRIPT.md)
  --force          export: replace an existing SCRIPT.md
  --dry-run        apply: validate and report without writing
  --interval MS    watch: polling interval, at least 100 (default: 500)
  --once           watch: apply once and exit

Export reads literal notes arrays without executing slide code. Apply changes only
the exact note strings, checks their base hashes, then parses and reads them back.
Keep marker lines intact. Save ongoing edits before exporting again with --force.`);
    return;
  }
  if (opts.command === 'export') {
    const slides = readDeckNotes(opts.deck), markdown = renderScript(slides);
    const back = parseScript(markdown);
    const notes = slides.flatMap(slide => slide.notes.map((note, k) => ({ sid: slide.sid, k, text: note.text })));
    if (back.length !== notes.length || back.some((note, i) => note.sid !== notes[i].sid || note.k !== notes[i].k || note.text !== notes[i].text)) throw new Error('Export failed its exact round-trip check; nothing was written.');
    if (fs.existsSync(opts.script) && fs.readFileSync(opts.script, 'utf8') !== markdown && !opts.force) throw new Error('SCRIPT.md exists. Save any edits, then use export --force to replace it.');
    atomicWrite(opts.script, markdown);
    console.log(`Exported ${notes.length} notes from ${slides.length} slides; exact round-trip check passed.`);
    return;
  }
  if (!['apply', 'watch'].includes(opts.command)) throw new Error(`Unknown command: ${opts.command}`);
  const run = () => {
    const result = applyScript(opts.deck, opts.script, { dryRun: !!opts.dryrun });
    console.log(`${opts.dryrun ? 'Would apply' : 'Applied'} ${result.applied.length} notes; ${result.already.length} already current.`);
  };
  if (opts.command === 'apply' || opts.once) { run(); return; }
  console.log('Watching SCRIPT.md. Save a note, then reload the deck. Press Ctrl+C to stop.');
  let previous = null;
  for (;;) {
    try {
      const contents = fs.readFileSync(opts.script, 'utf8');
      const hash = digest(contents);
      if (hash !== previous) {
        await new Promise(resolve => setTimeout(resolve, opts.interval));
        if (fs.readFileSync(opts.script, 'utf8') !== contents) continue;
        previous = hash;
        try { run(); previous = digest(fs.readFileSync(opts.script, 'utf8')); }
        catch (error) { console.error(`Waiting for a corrected save: ${error.message}`); }
      }
    } catch (error) { console.error(`Waiting for SCRIPT.md: ${error.message}`); }
    await new Promise(resolve => setTimeout(resolve, opts.interval));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
