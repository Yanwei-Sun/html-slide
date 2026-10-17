#!/usr/bin/env node
// Offline checks only: no Wrangler process, account access or disk-backed D1.
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { d1Arguments, parseBox, parseOptions, q } from '../comments/lib.mjs';

globalThis.crypto ??= webcrypto;
globalThis.HTMLRewriter = class {
  on(selector, handler) { assert.equal(selector, 'head'); this.handler = handler; return this; }
  transform(response) {
    let insertion = '';
    this.handler.element({ prepend(html, options) { assert.equal(options.html, true); insertion = html; } });
    const body = new ReadableStream({ async start(controller) {
      controller.enqueue(new TextEncoder().encode((await response.text()).replace('<head>', '<head>' + insertion)));
      controller.close();
    } });
    return new Response(body, response);
  }
};
const source = readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

class MemoryD1 {
  comments = [];
  images = [];
  notes = [];
  prepare(statement) {
    const database = this;
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first(column) {
        const values = this.values;
        let row;
        if (statement.startsWith('SELECT COUNT')) row = { c: database.comments.length };
        else if (statement.startsWith('SELECT COALESCE')) row = { s: database.images.reduce((sum, image) => sum + image.bytes, 0) };
        else if (statement.startsWith('SELECT i.mime, i.data')) row = database.images.find(image => image.cid === values[0] && image.i === values[1] && database.comments.some(comment => comment.cid === image.cid && comment.deck === values[2]));
        else if (statement.startsWith('SELECT sid, k, text, orig, updated, status')) row = database.notes.find(note => note.eid === values[0]);
        else throw new Error('Unmocked first statement.');
        return column ? row?.[column] ?? null : row || null;
      },
      async all() {
        if (!statement.startsWith('SELECT sid, k, sent, orig')) throw new Error('Unmocked all statement.');
        return { results: database.notes.filter(note => note.deck === this.values[0] && note.status === 'done').map(({ sid, k, sent, orig }) => ({ sid, k, sent, orig })) };
      },
      async run() {
        const values = this.values;
        if (!statement.startsWith('INSERT INTO script_edits')) throw new Error('Unmocked run statement.');
        const previous = database.notes.find(note => note.eid === values[0]);
        if (previous && (previous.updated !== values[7] || previous.status !== values[8])) return { meta: { changes: 0 } };
        const [eid, deck, sid, k, text, orig, updated] = values;
        const note = { eid, deck, sid, k, text, sent: text, orig, updated, status: 'open', applied: '' };
        if (previous) Object.assign(previous, note); else database.notes.push(note);
        return { meta: { changes: 1 } };
      },
      async executeBatch() {
        const values = this.values;
        if (statement.startsWith('SELECT sid, k, sent, orig')) return { results: database.notes.filter(note => note.deck === values[0] && note.status === 'done').map(({ sid, k, sent, orig }) => ({ sid, k, sent, orig })) };
        if (statement.startsWith('SELECT sid, k, text, orig, updated')) return { results: database.notes.filter(note => note.deck === values[0] && note.status === 'open').map(({ sid, k, text, orig, updated }) => ({ sid, k, text, orig, updated })) };
        if (statement.startsWith('SELECT cid, n')) return { results: database.comments.filter(comment => comment.deck === values[0]) };
        if (statement.startsWith('SELECT i.cid')) return { results: database.images.filter(image => database.comments.some(comment => comment.cid === image.cid && comment.deck === values[0])).map(({ cid, i, mime, w, h, bytes }) => ({ cid, i, mime, w, h, bytes })) };
        if (statement.startsWith('INSERT INTO comments ')) {
          const [cid, deck, n, k, sid, title, author, text, created, box] = values;
          database.comments.push({ cid, deck, n, k, sid, title, author, text, created, box, status: 'open', reply: '', resolved: '' });
          return { results: [] };
        }
        if (statement.startsWith('INSERT INTO comment_images')) {
          const [cid, i, mime, w, h, bytes, data] = values;
          database.images.push({ cid, i, mime, w, h, bytes, data });
          return { results: [] };
        }
        throw new Error('Unmocked batch statement.');
      },
    };
  }
  async batch(statements) { return Promise.all(statements.map(statement => statement.executeBatch())); }
}

// A real lossless one-pixel PNG; altered header dimensions exercise limits before decoding.
function pngFixture(width, height) {
  const crc = bytes => { let value = 0xffffffff; for (const byte of bytes) { value ^= byte; for (let bit=0;bit<8;bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; } return (value ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const payload=Buffer.concat([Buffer.from(type),data]), size=Buffer.alloc(4), checksum=Buffer.alloc(4); size.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(payload)); return Buffer.concat([size,payload,checksum]); };
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,24,128,96,255]))),chunk('IEND',Buffer.alloc(0))]);
}

let checks = 0;
const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const ok = value => { assert.ok(value); checks++; };
const db = new MemoryD1();
const env = { PASSCODE: 'smoke-passphrase', COOKIE_SECRET: 'smoke-cookie-secret-with-enough-random-looking-characters', COMMENTS_DB: db };
const origin = 'http://slides.test';
const call = (path = '/', options = {}, settings = env) => onRequest({
  request: new Request(origin + path, options), env: settings,
  next: async () => new Response('<!doctype html><head><title>Template</title></head>', { headers: { 'Content-Type': 'text/html' } }),
});
const form = (p, to = '/', h = '') => ({ method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ p, to, h }).toString() });
const noStore = response => {
  equal(response.headers.get('Cache-Control'), 'no-store');
  ok(response.headers.get('X-Robots-Tag').includes('noindex'));
};

try {
  let response = await call('/', {}, {});
  equal(response.status, 503); noStore(response);
  ok((await response.text()).includes('PASSCODE and COOKIE_SECRET'));
  equal((await call('/__comments?deck=template')).status, 401);
  response = await call('/'); equal(response.status, 200); noStore(response);
  ok(!(await response.text()).includes(env.PASSCODE));
  equal((await call('/__unlock', { ...form(env.PASSCODE), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 403);
  equal((await call('/__unlock', { ...form(env.PASSCODE), headers: { Origin: 'https://elsewhere.test', 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 403);
  equal((await call('/__unlock', form('wrong'))).status, 401);
  response = await call('/__unlock', form(env.PASSCODE, '//elsewhere.test', '#2.1'));
  equal(response.status, 303); equal(response.headers.get('Location'), '/#2.1'); noStore(response);
  const cookieHeader = response.headers.get('Set-Cookie'), cookie = cookieHeader.split(';')[0];
  ok(cookieHeader.includes('HttpOnly')); ok(cookieHeader.includes('SameSite=Lax')); ok(!cookieHeader.includes('Secure'));
  ok(!cookie.includes(env.PASSCODE));
  const auth = { Cookie: cookie };
  const post = body => ({ method: 'POST', headers: { ...auth, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  response = await onRequest({ request: new Request('https://slides.test/__unlock', { ...form(env.PASSCODE), headers: { Origin: 'https://slides.test', 'Content-Type': 'application/x-www-form-urlencoded' } }), env, next: async () => new Response('unused') });
  ok(response.headers.get('Set-Cookie').includes('; Secure'));
  equal((await call('/__comments?deck=template', { headers: { Cookie: cookie.slice(0, -1) + (cookie.endsWith('0') ? '1' : '0') } })).status, 401);
  equal((await call('/__comments?deck=template', { headers: auth }, { ...env, PASSCODE: 'changed-passphrase' })).status, 401);
  equal((await call('/__comments?deck=template', { headers: auth }, { ...env, COOKIE_SECRET: 'changed-signing-secret' })).status, 401);
  response = await call('/', { headers: auth }); equal(response.status, 200); noStore(response);
  ok((await response.text()).includes('<head><script>window.DECK_COLLABORATION=true;'));
  response = await call('/decks', { headers: auth }); equal(response.status, 200); noStore(response);
  ok((await response.text()).includes('Template deck'));
  equal((await call('/not-a-route', { headers: auth })).status, 404);
  equal((await call('/__version.txt', { headers: auth })).status, 200);
  equal((await call('/__comments?deck=other', { headers: auth })).status, 400);
  response = await call('/__comments?deck=template', { headers: auth }); equal(await response.json(), { comments: [] });
  const png = pngFixture(1, 1);
  const comment = { deck: 'template', n: 1, k: 0, sid: 'S01', title: '<title>', author: '<author>', text: '<img src=x onerror=alert(1)>', box: { x: 10, y: 20, w: -5, h: -10 }, images: [{ mime: 'image/png', w: 1, h: 1, data: png.toString('base64') }] };
  equal((await call('/__comments', post({ ...comment, deck: 'other' }))).status, 400);
  equal((await call('/__comments', post({ ...comment, sid: '<script>' }))).status, 400);
  equal((await call('/__comments', post({ ...comment, images: [{ mime: 'image/svg+xml', data: 'AAAA' }] }))).status, 400);
  equal((await call('/__comments', post({ ...comment, box: { x: '1', y: 1, w: 1, h: 1 } }))).status, 400);
  equal((await call('/__comments', post({ deck: 'template' }))).status, 400);
  equal((await call('/__comments', { ...post(comment), headers: { ...auth, Origin: 'https://elsewhere.test', 'Content-Type': 'application/json' } })).status, 403);
  equal((await call('/__comments', { ...post(comment), headers: { ...auth, Origin: origin, 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' } })).status, 403);
  for (const image of [
    { mime: 'image/png', w: 1, h: 1, data: Buffer.from([137,80,78,71,13,10,26,10]).toString('base64') },
    { mime: 'image/png', w: 2, h: 1, data: png.toString('base64') },
    { mime: 'image/png', w: 8193, h: 1, data: pngFixture(8193,1).toString('base64') },
    { mime: 'image/png', w: 5000, h: 5000, data: pngFixture(5000,5000).toString('base64') },
    { mime: 'image/jpeg', w: 1, h: 1, data: Buffer.from([255,216,255,217]).toString('base64') },
    { mime: 'image/webp', w: 1, h: 1, data: Buffer.from('RIFF\x04\x00\x00\x00WEBP', 'binary').toString('base64') },
  ]) equal((await call('/__comments', post({ ...comment, images:[image] }))).status,400);
  const badCRC = Buffer.from(png); badCRC[29] ^= 1;
  equal((await call('/__comments', post({ ...comment, images:[{mime:'image/png',w:1,h:1,data:badCRC.toString('base64')}] }))).status,400);
  response = await call('/__comments', post(comment)); equal(response.status, 200);
  const { cid } = await response.json(); ok(/^[0-9a-z]{9}-[0-9a-f]{8}$/.test(cid));
  equal(db.comments.length, 1); equal(db.comments[0].reply, '');
  response = await call('/__comments?deck=template', { headers: auth }); noStore(response);
  const raw = await response.text(); ok(!raw.includes('<img'));
  const listed = JSON.parse(raw).comments[0];
  equal(listed.text, comment.text); equal(listed.box, { x: 5, y: 10, w: 5, h: 10 }); equal(listed.images[0].mime, 'image/png');
  equal((await call(`/__comments/img?cid=${cid}&i=0`)).status, 401);
  response = await call(`/__comments/img?cid=${cid}&i=0`, { headers: auth }); equal(response.status, 200); noStore(response);
  equal(response.headers.get('Content-Type'), 'image/png'); equal(Buffer.from(await response.arrayBuffer()), png);
  response = await call(`/__comments/img?cid=${cid}&i=0`, { method: 'HEAD', headers: auth }); equal(response.status, 200); equal((await response.arrayBuffer()).byteLength, 0);
  db.comments[0].status = 'done'; db.comments[0].reply = '<reply> Fixed the label.'; db.comments[0].resolved = new Date().toISOString();
  response = await call('/__comments?deck=template', { headers: auth }); equal((await response.json()).comments[0].reply, '<reply> Fixed the label.');
  const note = { deck: 'template', sid: 'S01', k: 0, text: 'Revised note', orig: 'Original note', updated: null };
  const { updated: ignoredRevision, ...unversioned } = note;
  equal((await call('/__script', post(unversioned))).status, 400);
  response = await call('/__script', post(note)); equal(response.status, 200);
  const saved = await response.json(); equal(saved.eid, 'template|S01|0'); ok(Number.isFinite(Date.parse(saved.updated)));
  equal((await call('/__script', post({ ...note, updated: '2000-01-01T00:00:00.000Z' }))).status, 409);
  equal(db.notes[0].text, 'Revised note');
  response = await call('/__script?deck=template', { headers: auth });
  equal((await response.json()).open, [{ sid: 'S01', k: 0, text: 'Revised note', orig: 'Original note', updated: saved.updated }]);
  response = await call('/__script', post({ ...note, text: 'Newest note', updated: saved.updated })); equal(response.status, 200);
  ok((await response.json()).updated > saved.updated);
  db.notes[0].status = 'done';
  response = await call('/__script?deck=template', { headers: auth }); equal(await response.json(), { ok: true, rows: [{ sid: 'S01', k: 0, sent: 'Newest note', orig: 'Original note' }], open: [] });
  equal((await call('/__script', post({ ...note, text: null }))).status, 200); equal(db.notes[0].text, null); equal(db.notes[0].sent, null);
  equal((await call('/__script', post({ ...note, text: 'x'.repeat(12001) }))).status, 400);
  equal((await call('/__script', { ...post(note), body: 'x'.repeat(65537) })).status, 413);
  equal((await call('/__comments', { ...post(comment), headers: { ...auth, Origin: origin, 'Content-Type': 'text/plain' } })).status, 415);
  equal((await call('/__comments', { ...post(comment), headers: { ...auth, Origin: origin, 'Content-Type': 'application/json', 'Content-Length': String(8 * 1024 * 1024 + 1) } })).status, 413);
  equal((await call('/__comments', { method: 'DELETE', headers: { ...auth, Origin: origin } })).status, 405);
  equal((await call('/__comments?deck=template', { headers: auth }, { ...env, COMMENTS_DB: undefined })).status, 503);
  const broken = { prepare() { throw new Error('Database diagnostic must remain private.'); }, async batch() { throw new Error('Database diagnostic must remain private.'); } };
  response = await call('/__comments?deck=template', { headers: auth }, { ...env, COMMENTS_DB: broken }); equal(response.status, 503); ok(!(await response.text()).includes('diagnostic'));
  for (let index = 0; index < 10; index++) await call('/__unlock', { ...form('wrong'), headers: { ...form('wrong').headers, 'CF-Connecting-IP': 'rate-test' } });
  equal((await call('/__unlock', { ...form(env.PASSCODE), headers: { ...form(env.PASSCODE).headers, 'CF-Connecting-IP': 'rate-test' } })).status, 429);

  const local = parseOptions(['--database', 'test-comments']);
  equal(local.mode, 'local'); ok(d1Arguments('SELECT 1;', local).includes('--local')); ok(d1Arguments('SELECT 1;', local).includes('--persist-to'));
  const remote = parseOptions([cid, 'fixed', '--remote', '--config=cloudflare/example.toml', '--database', 'test-comments']);
  equal(remote.positional, [cid, 'fixed']); ok(d1Arguments('SELECT 1;', remote).includes('--remote')); ok(!d1Arguments('SELECT 1;', remote).includes('--persist-to'));
  assert.throws(() => parseOptions(['--remote', '--local'])); checks++;
  assert.throws(() => parseOptions(['--remote', '--persist-to', 'work/local'])); checks++;
  equal(parseOptions(['--quiet=0', '--interval', '500', '--once']).quiet, 0);
  equal(q("a'; DROP TABLE comments; --"), "'a''; DROP TABLE comments; --'");
  assert.throws(() => q('a\0b')); checks++;
  equal(parseBox('{"x":1,"y":2,"w":3,"h":4}'), { x: 1, y: 2, w: 3, h: 4 });
  equal(parseBox('{"x":1900,"y":2,"w":100,"h":4}'), null);
  console.log(`Offline smoke: ${checks} middleware and CLI assertions passed.`);
} catch (error) {
  console.error('Offline smoke failed: ' + String(error.message).split('\n')[0]);
  process.exitCode = 1;
}
