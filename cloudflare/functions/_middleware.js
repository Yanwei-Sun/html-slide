const DECK = 'template';
const COOKIE = 'html_slide_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const MAX_BODY = 8 * 1024 * 1024;
const MAX_NOTE_BODY = 64 * 1024;
const MAX_TEXT = 4000;
const MAX_IMAGES = 4;
const MAX_IMAGE = 1.5 * 1024 * 1024;
const MAX_IMAGE_STORAGE = 256 * 1024 * 1024;
const MAX_COMMENTS = 5000;
const CID = /^[0-9a-z]{9}-[0-9a-f]{8}$/;
const SID = /^[A-Za-z0-9_-]{1,60}$/;
const encoder = new TextEncoder();
const limits = new Map();

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function protect(response, method) {
  const result = new Response(method === 'HEAD' ? null : response.body, response);
  result.headers.set('Cache-Control', 'no-store');
  result.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'same-origin');
  return result;
}

function json(value, status = 200, headers = {}) {
  // These responses are data, including any author-supplied text.
  return new Response(JSON.stringify(value).replace(/</g, '\\u003c'), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}
const bad = error => json({ ok: false, error }, 400);
const methodNotAllowed = allow => json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: allow });

function page(message, { status = 200, to = '/', hash = '', wrong = false, setup = false } = {}) {
  const form = setup ? `<p>${escapeHTML(message)}</p>` : `<p>Enter the shared passcode to open the slides.</p>
<form method="post" action="/__unlock" autocomplete="off">
<label for="passcode">Passcode</label><input id="passcode" name="p" type="password" required autofocus maxlength="512">
<input name="to" type="hidden" value="${escapeHTML(to)}"><input name="h" id="hash" type="hidden" value="${escapeHTML(hash)}">
<button type="submit">Open slides</button><p role="alert">${wrong ? 'That passcode did not match. Please try again.' : ''}</p>
</form><script>var h=document.getElementById('hash');h.value=location.hash||h.value;</script>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow, noarchive"><link rel="icon" href="data:,">
<title>${setup ? 'Slides need setup' : 'Shared slides'}</title><style>
:root{color-scheme:light dark;font:17px/1.5 system-ui,sans-serif}body{margin:0;min-height:100vh;display:grid;place-items:center;background:light-dark(#f7f5f0,#191919)}
main{box-sizing:border-box;width:min(100%,420px);padding:32px}h1{font-size:1.6rem;font-weight:600}p{overflow-wrap:anywhere}label{display:block}
input,button{box-sizing:border-box;width:100%;font:inherit;padding:10px;margin-top:8px;border-radius:6px}button{border:0;background:#275d86;color:white;cursor:pointer}p[role=alert]{min-height:3em}
</style></head><body><main><h1>${setup ? 'The slides need a little setup' : 'Shared slides'}</h1>${form}</main></body></html>`, {
    status, headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

function safePath(value, origin) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\r\n\u0000-\u0020]/.test(value)) return '/';
  try {
    const target = new URL(value, origin);
    return target.origin === origin && ['/', '/index.html', '/decks'].includes(target.pathname) ? target.pathname + target.search : '/';
  } catch { return '/'; }
}

function sameOrigin(request, url) {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = request.headers.get('Origin');
  if (origin !== null) return origin === url.origin;
  try { return new URL(request.headers.get('Referer')).origin === url.origin; }
  catch { return false; }
}

// This is a bounded, best-effort per-isolate limit, rather than a global quota.
function allowRequest(key, maximum, windowMs = 60_000) {
  const now = Date.now();
  if (limits.size >= 2048) {
    for (const [name, item] of limits) if (item.until <= now) limits.delete(name);
    if (limits.size >= 2048 && !limits.has(key)) return false;
  }
  let item = limits.get(key);
  if (!item || item.until <= now) {
    item = { count: 0, until: now + windowMs };
    limits.set(key, item);
  }
  return ++item.count <= maximum;
}
const rateLimited = () => json({ ok: false, error: 'Please wait a minute before trying again.' }, 429, { 'Retry-After': '60' });

async function readBody(request, maximum) {
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maximum)) {
    throw new RangeError('Request too large.');
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new RangeError('Request too large.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

async function bodyJSON(request, maximum) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return { error: json({ ok: false, error: 'Use application/json.' }, 415) };
  }
  try {
    const body = JSON.parse(await readBody(request, maximum));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: bad('Invalid JSON object.') };
    return { body };
  } catch (error) {
    return { error: error instanceof RangeError ? json({ ok: false, error: 'Request too large.' }, 413) : bad('Invalid JSON.') };
  }
}

function hex(bytes) { return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function makeCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = `${expires}.${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env.COOKIE_SECRET), encoder.encode(`${token}\n${env.PASSCODE}`));
  return `${token}.${hex(signature)}`;
}
async function hasSession(request, env) {
  const cookie = (request.headers.get('Cookie') || '').split(';').map(item => item.trim()).find(item => item.startsWith(COOKIE + '='));
  const value = cookie?.slice(COOKIE.length + 1) || '';
  const match = /^(\d{10,12})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[1]), now = Math.floor(Date.now() / 1000);
  if (expires <= now || expires > now + SESSION_SECONDS + 60) return false;
  const signature = Uint8Array.from(match[3].match(/../g), part => parseInt(part, 16));
  return crypto.subtle.verify('HMAC', await signingKey(env.COOKIE_SECRET), signature, encoder.encode(`${match[1]}.${match[2]}\n${env.PASSCODE}`));
}
async function matchesPasscode(candidate, passcode) {
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  const [a, b] = await Promise.all([digest(candidate), digest(passcode)]);
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

async function unlock(request, url, env) {
  if (request.method !== 'POST') return methodNotAllowed('POST');
  if (!sameOrigin(request, url)) return json({ ok: false, error: 'A same-origin request is required.' }, 403);
  const address = request.headers.get('CF-Connecting-IP') || 'local';
  if (!allowRequest('unlock:' + address, 10)) return rateLimited();
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return bad('Invalid passcode form.');
  let form;
  try { form = new URLSearchParams(await readBody(request, 4096)); }
  catch (error) { return error instanceof RangeError ? json({ ok: false, error: 'Request too large.' }, 413) : bad('Invalid passcode form.'); }
  const to = safePath(form.get('to'), url.origin), candidate = form.get('p') || '';
  const hash = /^#[A-Za-z0-9_.=-]{0,120}$/.test(form.get('h') || '') ? form.get('h') : '';
  if (candidate.length > 512 || !await matchesPasscode(candidate, env.PASSCODE)) return page('', { status: 401, wrong: true, to, hash });
  return new Response(null, { status: 303, headers: {
    Location: to + hash,
    'Set-Cookie': `${COOKIE}=${await makeCookie(env)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`,
  } });
}

const integer = value => typeof value === 'number' && Number.isInteger(value) ? value : typeof value === 'string' && /^\d{1,6}$/.test(value) ? Number(value) : NaN;
function parseBox(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  if (!['x', 'y', 'w', 'h'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) return undefined;
  let { x, y, w, h } = value;
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  const x0 = Math.max(0, Math.min(x, 1920)), y0 = Math.max(0, Math.min(y, 1080));
  const x1 = Math.max(0, Math.min(x + w, 1920)), y1 = Math.max(0, Math.min(y + h, 1080));
  const round = number => Math.round(number * 10) / 10;
  const box = { x: round(x0), y: round(y0), w: round(x1 - x0), h: round(y1 - y0) };
  return box.w >= 1 && box.h >= 1 ? box : undefined;
}
const imageTypes = {
  'image/png': bytes => bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte),
  'image/jpeg': bytes => bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
  'image/webp': bytes => bytes.length >= 12 && [82, 73, 70, 70].every((byte, i) => bytes[i] === byte) && [87, 69, 66, 80].every((byte, i) => bytes[i + 8] === byte),
};
const MAX_IMAGE_DIMENSION = 8192, MAX_IMAGE_PIXELS = 16_000_000;
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes, start, end) {
  let value = 0xffffffff;
  for (let offset = start; offset < end; offset++) value = crcTable[(value ^ bytes[offset]) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
const withinImageLimits = (w, h) => Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= MAX_IMAGE_DIMENSION && h <= MAX_IMAGE_DIMENSION && w * h <= MAX_IMAGE_PIXELS;

// Read encoded dimensions and container structure instead of trusting browser-supplied metadata.
function imageDimensions(bytes, mime) {
  try {
    if (!imageTypes[mime](bytes)) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ascii = (offset, size) => String.fromCharCode(...bytes.subarray(offset, offset + size));
    if (mime === 'image/png') {
      let offset = 8, width, height, color, depth, palette = false, dataLength = 0, dataEnded = false;
      const prefix = [];
      while (offset + 12 <= bytes.length) {
        const length = view.getUint32(offset), end = offset + 12 + length, type = ascii(offset + 4, 4), data = offset + 8;
        if (end > bytes.length || !/^[A-Za-z]{4}$/.test(type) || (bytes[offset + 6] & 32) || crc32(bytes, offset + 4, data + length) !== view.getUint32(data + length)) return null;
        if (offset === 8 && (type !== 'IHDR' || length !== 13)) return null;
        if (type === 'IHDR') {
          if (offset !== 8 || length !== 13) return null;
          width = view.getUint32(data); height = view.getUint32(data + 4); depth = bytes[data + 8]; color = bytes[data + 9];
          if (!withinImageLimits(width, height) || !({ 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }[color]?.includes(depth)) || bytes[data + 10] !== 0 || bytes[data + 11] !== 0 || bytes[data + 12] > 1) return null;
        } else if (type === 'PLTE') {
          if (palette || dataLength || !length || length % 3 || length > 768 || color === 0 || color === 4 || (color === 3 && length / 3 > 2 ** depth)) return null;
          palette = true;
        } else if (type === 'IDAT') {
          if (dataEnded || (color === 3 && !palette)) return null;
          dataLength += length;
          for (let index = 0; index < length && prefix.length < 2; index++) prefix.push(bytes[data + index]);
        } else if (type === 'IEND') {
          if (length || end !== bytes.length || dataLength < 6 || prefix.length !== 2 || (prefix[0] & 15) !== 8 || (prefix[0] >>> 4) > 7 || ((prefix[0] << 8) + prefix[1]) % 31 || (prefix[1] & 32)) return null;
          return { w: width, h: height };
        } else {
          if (!(bytes[offset + 4] & 32)) return null; // Unknown critical PNG chunk.
          if (dataLength) dataEnded = true;
        }
        offset = end;
      }
      return null;
    }
    if (mime === 'image/jpeg') {
      if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return null;
      let offset = 2, dimensions = null, sof = null, scans = 0, entropy = 0;
      const components = new Set(), quantizers = new Set(), huffman = new Set();
      while (offset < bytes.length) {
        if (bytes[offset++] !== 255) return null;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 217) return offset === bytes.length && dimensions && scans && entropy ? dimensions : null;
        if (marker === 0 || marker === 216 || marker === 1 || (marker >= 208 && marker <= 215) || offset + 2 > bytes.length) return null;
        const length = view.getUint16(offset), start = offset + 2, end = offset + length;
        if (length < 2 || end > bytes.length) return null;
        if ([192, 193, 194].includes(marker)) {
          if (dimensions || length < 11 || bytes[start] !== 8) return null;
          const count = bytes[start + 5], width = view.getUint16(start + 3), height = view.getUint16(start + 1);
          if (![1, 3, 4].includes(count) || length !== 8 + 3 * count || !withinImageLimits(width, height)) return null;
          for (let index = 0; index < count; index++) {
            const at = start + 6 + index * 3, id = bytes[at], sampling = bytes[at + 1];
            if (components.has(id) || !(sampling >>> 4) || (sampling >>> 4) > 4 || !(sampling & 15) || (sampling & 15) > 4 || bytes[at + 2] > 3) return null;
            components.add(id);
          }
          dimensions = { w: width, h: height }; sof = marker;
        } else if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) return null;
        else if (marker === 219) {
          let at = start;
          while (at < end) {
            const table = bytes[at++], size = table >>> 4 ? 128 : 64;
            if ((table >>> 4) > 1 || (table & 15) > 3 || at + size > end) return null;
            for (let index = at; index < at + size; index += size === 128 ? 2 : 1) if (size === 128 ? view.getUint16(index) === 0 : bytes[index] === 0) return null;
            quantizers.add(table & 15); at += size;
          }
          if (at !== end) return null;
        } else if (marker === 196) {
          let at = start;
          while (at < end) {
            const table = bytes[at++];
            if ((table >>> 4) > 1 || (table & 15) > 3 || at + 16 > end) return null;
            let count = 0, slots = 1;
            for (let index = 0; index < 16; index++) { const number = bytes[at++]; count += number; slots = slots * 2 - number; if (slots < 0) return null; }
            if (!count || count > 256 || at + count > end) return null;
            huffman.add(table); at += count;
          }
          if (at !== end) return null;
        } else if (marker === 218) {
          const count = bytes[start];
          if (!dimensions || !quantizers.size || !count || count > components.size || length !== 6 + 2 * count) return null;
          const spectralStart = bytes[end - 3], spectralEnd = bytes[end - 2], approximation = bytes[end - 1];
          if (spectralStart > spectralEnd || spectralEnd > 63 || (approximation >>> 4) > 13 || (approximation & 15) > 13 || (sof !== 194 && (spectralStart !== 0 || spectralEnd !== 63 || approximation !== 0))) return null;
          const selected = new Set();
          for (let index = 0; index < count; index++) {
            const at = start + 1 + index * 2, component = bytes[at], tables = bytes[at + 1];
            if (!components.has(component) || selected.has(component) || (tables >>> 4) > 3 || (tables & 15) > 3 || (spectralStart === 0 && !huffman.has(tables >>> 4)) || ((spectralStart > 0 || sof !== 194) && !huffman.has(16 | (tables & 15)))) return null;
            selected.add(component);
          }
          scans++; offset = end;
          while (offset < bytes.length) {
            if (bytes[offset] !== 255) { entropy++; offset++; continue; }
            if (offset + 1 >= bytes.length) return null;
            if (bytes[offset + 1] === 0) { entropy++; offset += 2; continue; }
            if (bytes[offset + 1] >= 208 && bytes[offset + 1] <= 215) { offset += 2; continue; }
            break;
          }
          continue;
        }
        offset = end;
      }
      return null;
    }
    if (mime === 'image/webp') {
      if (bytes.length < 20 || view.getUint32(4, true) !== bytes.length - 8 || ascii(8, 4) !== 'WEBP') return null;
      let offset = 12, dimensions = null, extended = null, alpha = false, kind = '';
      while (offset + 8 <= bytes.length) {
        const type = ascii(offset, 4), length = view.getUint32(offset + 4, true), data = offset + 8, end = data + length, padded = end + (length & 1);
        if (padded > bytes.length || (length & 1 && bytes[end] !== 0)) return null;
        if (type === 'VP8X') {
          if (offset !== 12 || extended || length !== 10 || (bytes[data] & 195) || bytes[data + 1] || bytes[data + 2] || bytes[data + 3]) return null;
          const width = 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16), height = 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16);
          if (!withinImageLimits(width, height)) return null;
          extended = { w: width, h: height };
        } else if (type === 'VP8 ') {
          if (dimensions || length < 11 || (bytes[data] & 1) || !(bytes[data] & 16) || ascii(data + 3, 3) !== '\x9d\x01\x2a') return null;
          const partition = (bytes[data] | bytes[data + 1] << 8 | bytes[data + 2] << 16) >>> 5;
          if (partition < 7 || partition > length - 3) return null;
          dimensions = { w: view.getUint16(data + 6, true) & 16383, h: view.getUint16(data + 8, true) & 16383 }; kind = type;
        } else if (type === 'VP8L') {
          if (dimensions || length < 6 || bytes[data] !== 47) return null;
          const bits = view.getUint32(data + 1, true);
          if (bits >>> 29) return null;
          dimensions = { w: 1 + (bits & 16383), h: 1 + ((bits >>> 14) & 16383) }; kind = type;
        } else if (type === 'ALPH') {
          if (!length || alpha || (bytes[data] & 192) || (bytes[data] & 3) > 1 || ((bytes[data] >>> 4) & 3) > 1) return null;
          alpha = true;
        } else if (type === 'ANIM' || type === 'ANMF') return null;
        offset = padded;
      }
      if (offset !== bytes.length || !dimensions || !withinImageLimits(dimensions.w, dimensions.h) || (extended && (extended.w !== dimensions.w || extended.h !== dimensions.h)) || (alpha && kind !== 'VP8 ')) return null;
      return dimensions;
    }
  } catch { /* Truncated or inconsistent encoded image. */ }
  return null;
}

function decodeImage(image) {
  if (!image || typeof image !== 'object' || !Object.hasOwn(imageTypes, image.mime)) return null;
  if (typeof image.data !== 'string' || !image.data.length || image.data.length > Math.ceil(MAX_IMAGE / 3) * 4 || image.data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)) return null;
  let bytes;
  try { bytes = Uint8Array.from(atob(image.data), char => char.charCodeAt(0)); } catch { return null; }
  if (!bytes.length || bytes.length > MAX_IMAGE || !imageTypes[image.mime](bytes)) return null;
  const dimensions = imageDimensions(bytes, image.mime);
  if (!dimensions || !withinImageLimits(dimensions.w, dimensions.h)) return null;
  for (const dimension of ['w', 'h']) if (image[dimension] != null && image[dimension] !== dimensions[dimension]) return null;
  return { mime: image.mime, ...dimensions, bytes };
}
function newCid() { return Date.now().toString(36).padStart(9, '0') + '-' + hex(crypto.getRandomValues(new Uint8Array(4))); }
const databaseUnavailable = () => json({ ok: false, error: 'Comments need setup. Bind COMMENTS_DB and apply comments/schema.sql.' }, 503);

async function comments(request, url, db) {
  if (request.method === 'GET') {
    if (url.searchParams.get('deck') !== DECK) return bad('Unknown deck. Use template.');
    const [commentsResult, imagesResult] = await db.batch([
      db.prepare('SELECT cid, n, k, sid, title, author, text, created, status, reply, resolved, box FROM comments WHERE deck = ?1 ORDER BY created, cid').bind(DECK),
      db.prepare('SELECT i.cid, i.i, i.mime, i.w, i.h, i.bytes FROM comment_images i JOIN comments c ON c.cid = i.cid WHERE c.deck = ?1 ORDER BY i.cid, i.i').bind(DECK),
    ]);
    const images = new Map();
    for (const image of imagesResult.results || []) {
      if (!images.has(image.cid)) images.set(image.cid, []);
      const { i, mime, w, h, bytes } = image;
      images.get(image.cid).push({ i, mime, w, h, bytes });
    }
    return json({ comments: (commentsResult.results || []).map(comment => {
      let box = null;
      try { box = comment.box ? parseBox(JSON.parse(comment.box)) || null : null; } catch { /* Invalid old data has no box. */ }
      return { ...comment, box, images: images.get(comment.cid) || [] };
    }) });
  }
  if (request.method !== 'POST') return methodNotAllowed('GET, POST');
  const { body, error } = await bodyJSON(request, MAX_BODY);
  if (error) return error;
  if (!['deck', 'n', 'k', 'sid', 'title', 'author', 'text'].every(key => Object.hasOwn(body, key))) return bad('Missing comment fields.');
  if (!Object.hasOwn(body, 'box')) body.box = null;
  if (!Object.hasOwn(body, 'images')) body.images = [];
  if (body.deck !== DECK) return bad('Unknown deck. Use template.');
  for (const [key, maximum] of [['sid', 60], ['title', 300], ['author', 60], ['text', MAX_TEXT]]) {
    if (typeof body[key] !== 'string' || body[key].length > maximum || body[key].includes('\0')) return bad('Invalid ' + key + '.');
  }
  if (!SID.test(body.sid)) return bad('Invalid slide id.');
  const n = integer(body.n), k = integer(body.k), box = parseBox(body.box);
  if (!(n >= 1 && n <= 10000 && k >= 0 && k <= 10000)) return bad('Invalid slide or click number.');
  if (box === undefined) return bad('Invalid box.');
  if (!Array.isArray(body.images) || body.images.length > MAX_IMAGES) return bad('Use at most four images.');
  const images = body.images.map(decodeImage);
  if (images.some(image => !image)) return bad('Images must be valid PNG, JPEG or static WebP, at most 1.5 MB, 8192 pixels per side and 16 million pixels. Supplied dimensions must match the file.');
  const text = body.text.trim(), author = body.author.trim(), title = body.title.trim();
  if (!text && !box && !images.length) return bad('The comment is empty.');
  const count = await db.prepare('SELECT COUNT(*) AS c FROM comments WHERE deck = ?1').bind(DECK).first('c');
  if (count >= MAX_COMMENTS) return json({ ok: false, error: 'The comment limit has been reached.' }, 429);
  if (images.length) {
    const used = await db.prepare('SELECT COALESCE(SUM(bytes), 0) AS s FROM comment_images').first('s');
    if (Number(used) + images.reduce((sum, image) => sum + image.bytes.length, 0) > MAX_IMAGE_STORAGE) return json({ ok: false, error: 'Image storage is full.' }, 429);
  }
  const cid = newCid(), created = new Date().toISOString();
  await db.batch([
    db.prepare('INSERT INTO comments (cid, deck, n, k, sid, title, author, text, created, box) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)')
      .bind(cid, DECK, n, k, body.sid, title, author, text, created, box ? JSON.stringify(box) : ''),
    ...images.map((image, i) => db.prepare('INSERT INTO comment_images (cid, i, mime, w, h, bytes, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
      .bind(cid, i, image.mime, image.w, image.h, image.bytes.length, image.bytes.buffer)),
  ]);
  return json({ ok: true, cid });
}

async function image(request, url, db) {
  if (!['GET', 'HEAD'].includes(request.method)) return methodNotAllowed('GET, HEAD');
  const cid = url.searchParams.get('cid') || '', i = integer(url.searchParams.get('i'));
  if (!CID.test(cid) || !(i >= 0 && i < MAX_IMAGES)) return json({ ok: false, error: 'Image not found.' }, 404);
  const row = await db.prepare('SELECT i.mime, i.data FROM comment_images i JOIN comments c ON c.cid = i.cid WHERE i.cid = ?1 AND i.i = ?2 AND c.deck = ?3').bind(cid, i, DECK).first();
  if (!row || !Object.hasOwn(imageTypes, row.mime)) return json({ ok: false, error: 'Image not found.' }, 404);
  const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : ArrayBuffer.isView(row.data) ? new Uint8Array(row.data.buffer, row.data.byteOffset, row.data.byteLength) : new Uint8Array(row.data);
  if (bytes.length > MAX_IMAGE || !imageDimensions(bytes, row.mime)) return json({ ok: false, error: 'Image not found.' }, 404);
  return new Response(request.method === 'HEAD' ? null : bytes, { headers: {
    'Content-Type': row.mime, 'Content-Security-Policy': "default-src 'none'; sandbox",
  } });
}

async function scriptEdit(request, url, db) {
  if (request.method === 'GET') {
    if (url.searchParams.get('deck') !== DECK) return bad('Unknown deck. Use template.');
    const [done, open] = await db.batch([
      db.prepare("SELECT sid, k, sent, orig FROM script_edits WHERE deck = ?1 AND status = 'done'").bind(DECK),
      db.prepare("SELECT sid, k, text, orig, updated FROM script_edits WHERE deck = ?1 AND status = 'open'").bind(DECK),
    ]);
    return json({ ok: true, rows: done.results || [], open: open.results || [] });
  }
  if (request.method !== 'POST') return methodNotAllowed('GET, POST');
  const { body, error } = await bodyJSON(request, MAX_NOTE_BODY);
  if (error) return error;
  if (body.deck !== DECK || typeof body.sid !== 'string' || !SID.test(body.sid)) return bad('Invalid deck or slide id.');
  const k = integer(body.k);
  if (!(k >= 0 && k <= 200)) return bad('Invalid click.');
  if (!Object.hasOwn(body, 'text') || (body.text !== null && typeof body.text !== 'string') || typeof body.orig !== 'string') return bad('Invalid note.');
  if ((body.text?.length || 0) > 12000 || body.orig.length > 12000 || body.orig.includes('\0') || body.text?.includes('\0')) return bad('The note is too long or contains invalid characters.');
  if (!Object.hasOwn(body, 'updated') || (body.updated !== null && (typeof body.updated !== 'string' || body.updated.length > 40 || !Number.isFinite(Date.parse(body.updated))))) return bad('An expected note revision is required. Reload the shared script before saving.');
  const eid = `${DECK}|${body.sid}|${k}`;
  const previous = await db.prepare('SELECT sid, k, text, orig, updated, status FROM script_edits WHERE eid = ?1').bind(eid).first();
  const openVersion = row => row?.status === 'open' ? { sid: row.sid, k: row.k, text: row.text, orig: row.orig, updated: row.updated } : null;
  const conflict = current => json({ ok: false, conflict: true, error: 'Another coauthor saved this note. Your text is kept in this browser; review both versions.', current: openVersion(current) }, 409);
  if (body.updated !== (previous?.status === 'open' ? previous.updated : null)) return conflict(previous);
  const now = new Date(Math.max(Date.now(), (Date.parse(previous?.updated) || 0) + 1)).toISOString();
  // The conditional upsert also catches another save between the read and write.
  const result = await db.prepare("INSERT INTO script_edits (eid, deck, sid, k, text, sent, orig, updated, status, applied) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, 'open', '') " +
    "ON CONFLICT(eid) DO UPDATE SET text = excluded.text, sent = excluded.sent, orig = excluded.orig, updated = excluded.updated, status = 'open', applied = '' WHERE script_edits.updated = ?8 AND script_edits.status = ?9")
    .bind(eid, DECK, body.sid, k, body.text, body.orig, now, previous?.updated ?? '', previous?.status ?? '').run();
  if (result.meta?.changes !== 1) return conflict(await db.prepare('SELECT sid, k, text, orig, updated, status FROM script_edits WHERE eid = ?1').bind(eid).first());
  return json({ ok: true, eid, updated: now });
}

function deckList() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Decks</title>
<style>body{margin:0;background:#f7f5f0;color:#252525;font:18px/1.5 system-ui,sans-serif}main{max-width:660px;margin:10vh auto;padding:24px}h1{font-size:32px}a{display:block;padding:24px;border:1px solid #d5d0c4;border-radius:12px;color:#245b70;background:white;text-decoration:none}a:focus-visible,a:hover{outline:2px solid #245b70}strong{display:block;font-size:22px}span,p{color:#666}</style>
</head><body><main><h1>Decks</h1><p>Choose a deck to read, comment on, or edit its script.</p>
<a href="/"><strong>Template deck</strong><span>The INFORMS example talk</span></a></main></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// Standalone bundles stay offline; only an authenticated Pages response enables collaboration.
function enableCollaboration(response) {
  if (!response.headers.get('Content-Type')?.includes('text/html')) return response;
  const script = `<script>window.DECK_COLLABORATION=true;(function(){
function start(){function mount(){var bar=document.getElementById('bar');if(!bar)return false;if(!document.getElementById('deck-list-button')){var b=document.createElement('button');b.id='deck-list-button';b.type='button';b.textContent='Decks';b.title='Choose a deck';b.addEventListener('click',function(e){e.stopPropagation();location.assign('/decks');});bar.appendChild(b);}return true;}
if(!mount()){var observer=new MutationObserver(function(){if(mount())observer.disconnect();});observer.observe(document.body,{childList:true});}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();</script>`;
  return new HTMLRewriter().on('head', { element(element) { element.prepend(script, { html: true }); } }).transform(response);
}

export async function onRequest({ request, next, env = {} }) {
  const url = new URL(request.url), path = url.pathname;
  const api = ['/__comments', '/__comments/img', '/__script'].includes(path);
  const finish = response => protect(response, request.method);
  if (typeof env.PASSCODE !== 'string' || !env.PASSCODE.trim() || env.PASSCODE.length > 512 || typeof env.COOKIE_SECRET !== 'string' || !env.COOKIE_SECRET.trim()) {
    const message = 'Ask the site owner to set PASSCODE and COOKIE_SECRET in the environment, then restart or redeploy the site.';
    return finish(api ? json({ ok: false, error: message }, 503) : page(message, { status: 503, setup: true }));
  }
  try {
    if (path === '/__unlock') return finish(await unlock(request, url, env));
    if (!await hasSession(request, env)) {
      return finish(api ? json({ ok: false, error: 'Passcode required.' }, 401) : page('', { to: safePath(path + url.search, url.origin) }));
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !sameOrigin(request, url)) return finish(json({ ok: false, error: 'A same-origin request is required.' }, 403));
    if (api) {
      const address = request.headers.get('CF-Connecting-IP') || 'local';
      const mutation = !['GET', 'HEAD'].includes(request.method);
      if (!allowRequest(`${mutation ? 'write' : 'read'}:${address}`, mutation ? 60 : 600)) return finish(rateLimited());
      if (!env.COMMENTS_DB) return finish(databaseUnavailable());
      let response;
      try {
        response = path === '/__comments' ? await comments(request, url, env.COMMENTS_DB) : path === '/__comments/img' ? await image(request, url, env.COMMENTS_DB) : await scriptEdit(request, url, env.COMMENTS_DB);
      } catch { response = databaseUnavailable(); }
      return finish(response);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return finish(methodNotAllowed('GET, HEAD'));
    if (path === '/index.html') return finish(new Response(null, { status: 302, headers: { Location: '/' + url.search } }));
    if (path === '/decks') return finish(deckList());
    if (path !== '/' && path !== '/__version.txt') return finish(new Response('Not found.', { status: 404 }));
    const response = await next();
    return finish(path === '/' ? enableCollaboration(response) : response);
  } catch {
    return finish(json({ ok: false, error: 'The slides are temporarily unavailable.' }, 503));
  }
}
