#!/usr/bin/env node
// Adapted from the original deck publisher: retain the deck's own page and engine,
// inline local resources, and redirect MathJax's font hook to embedded font bytes.
// Variant inheritance was flattened before this tool runs. For a new variant,
// copy the deck folder, edit that copy, and pass --deck; there is no variant service.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HELP = `Usage: node tools/bundle.mjs [--deck deck] [--out dist/deck.html]

Build one offline HTML file from an already flattened deck folder.
Defaults and relative paths resolve from the repository root, regardless of cwd.
All styles loaded by index.html, slide scripts, fonts, and local assets are kept.
Assets retain their original bytes; no image converter or Python is needed.
The result works via file://, including MathJax, notes, overview and print modes.

Variants were flattened before bundling. To make a new variant, copy deck/,
edit the copied slides/order.js, slide files and styles, then use --deck COPY.
Remote resource dependencies must be downloaded into the deck first.

Options:
  --deck DIR   Deck folder containing index.html and slides/order.js
  --out FILE   Output HTML (parent folders are created)
  -h, --help   Show this help
`;
const TYPES = {
  css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  html: 'text/html', htm: 'text/html', svg: 'image/svg+xml', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', ico: 'image/x-icon', bmp: 'image/bmp',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav',
  ogg: 'audio/ogg', pdf: 'application/pdf', vtt: 'text/vtt', wasm: 'application/wasm',
};
const FONT = /\.(?:woff2?|ttf|otf)$/i;
const ASSET = /\.(?:svg|png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|mp4|webm|mp3|wav|ogg|pdf|vtt|wasm)$/i;
const URL_PATTERN = /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)]*?))\s*\)/gi;
const TAG_PATTERN = /<!--[\s\S]*?-->|<script\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/script\s*>|<style\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/style\s*>|<[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const ATTR_PATTERN = /(\s+)([\w:-]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

function argumentsOf(argv) {
  const out = { deck: 'deck', out: 'dist/deck.html' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') return { help: true };
    const m = /^(--deck|--out)(?:=(.*))?$/.exec(argv[i]);
    if (!m) throw new Error(`Unknown argument: ${argv[i]}. Use --help.`);
    const value = m[2] ?? argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${m[1]}.`);
    out[m[1].slice(2)] = value;
  }
  return out;
}

function entities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, m => {
    const name = m.slice(1, -1).toLowerCase();
    return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[name]
      ?? String.fromCodePoint(name.startsWith('#x') ? parseInt(name.slice(2), 16) : +name.slice(1));
  });
}
const attrEscape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const scriptEscape = value => value.replace(/<\/script/gi, '<\\/script');
const cssUnescape = value => value.replace(/\\([\da-f]{1,6})\s?|\\([^\n\r])/gi,
  (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : char);
function attrOf(tag, name) {
  for (const m of tag.matchAll(ATTR_PATTERN)) if (m[2].toLowerCase() === name) return entities(m[4] ?? m[5] ?? m[6]);
  return null;
}
function attributes(tag, transform) {
  return tag.replace(ATTR_PATTERN, (all, space, name, equal, double, single, bare) => {
    const value = transform(name.toLowerCase(), entities(double ?? single ?? bare));
    return value === undefined ? all : `${space}${name}${equal}"${attrEscape(value)}"`;
  });
}

// Srcset URLs cannot contain unescaped spaces. A data URL's comma belongs to its
// URL, whereas a comma after a descriptor separates candidates.
function rewriteSrcset(value, fix) {
  let result = '', at = 0;
  while (at < value.length) {
    const leading = /^[\s,]*/.exec(value.slice(at))[0]; result += leading; at += leading.length;
    if (at >= value.length) break;
    let end = at;
    while (end < value.length && !/\s/.test(value[end]) && (value.startsWith('data:', at) || value[end] !== ',')) end++;
    const raw = value.slice(at, end);
    const trailing = raw.endsWith(',') ? ',' : '';
    result += fix(trailing ? raw.slice(0, -1) : raw) + trailing;
    at = end;
    if (!trailing) {
      while (at < value.length && value[at] !== ',') result += value[at++];
    }
  }
  return result;
}

// This is serialized into the output before any deck script executes. Dynamic
// slide loading and the original Deck.boot/filtering behavior stay in the engine.
function installResources(resources, fontFiles) {
  const base = 'https://offline.invalid/';
  const keyOf = value => {
    try { return decodeURIComponent(new URL(value, base).pathname).replace(/^\//, ''); } catch { return ''; }
  };
  const fix = value => {
    if (typeof value !== 'string' || !value || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(value)) return value;
    const uri = resources[keyOf(value)];
    return uri ? uri + (value.includes('#') ? value.slice(value.indexOf('#')) : '') : value;
  };
  const css = value => String(value).replace(/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)]*?))\s*\)/gi,
    (all, double, single, bare) => {
      const raw = (double ?? single ?? bare).trim();
      const next = fix(raw);
      return next === raw ? all : `url("${next}")`;
    });
  const srcset = value => rewriteSrcset(String(value), fix);
  const attribute = (name, value) => name === 'style' ? css(value)
    : name === 'srcset' ? srcset(value)
    : /^(?:src|href|xlink:href|poster|data)$/.test(name) ? fix(value) : value;
  const markup = value => String(value).replace(/<[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi,
    tag => tag.replace(/(\s+)(src|href|xlink:href|poster|data|srcset|style)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (all, space, name, equal, double, single, bare) => {
        const raw = (double ?? single ?? bare).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const next = attribute(name.toLowerCase(), raw);
        return next === raw ? all : `${space}${name}${equal}"${String(next).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
      })).replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (all, content) => all.replace(content, css(content)));
  window.__ASSETS = resources;
  window.__MJXF = Object.fromEntries(fontFiles.map(file => [file.split('/').pop(), resources[file]]));
  const sa = Element.prototype.setAttribute, sn = Element.prototype.setAttributeNS;
  Element.prototype.setAttribute = function (name, value) { return sa.call(this, name, attribute(name.toLowerCase(), String(value))); };
  Element.prototype.setAttributeNS = function (ns, name, value) { return sn.call(this, ns, name, attribute(name.toLowerCase(), String(value))); };
  function property(prototype, name, transform) {
    if (!prototype) return;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (!descriptor?.set || !descriptor.configurable) return;
    Object.defineProperty(prototype, name, { ...descriptor, set(value) { descriptor.set.call(this, transform(value)); } });
  }
  const classes = ['HTMLImageElement', 'HTMLScriptElement', 'HTMLSourceElement', 'HTMLMediaElement', 'HTMLTrackElement', 'HTMLEmbedElement', 'HTMLIFrameElement', 'HTMLInputElement'];
  for (const name of classes) property(window[name]?.prototype, 'src', fix);
  property(window.HTMLVideoElement?.prototype, 'poster', fix);
  property(window.HTMLLinkElement?.prototype, 'href', fix);
  property(window.HTMLObjectElement?.prototype, 'data', fix);
  property(window.HTMLImageElement?.prototype, 'srcset', srcset);
  property(window.HTMLSourceElement?.prototype, 'srcset', srcset);
  property(Element.prototype, 'innerHTML', markup);
  property(Element.prototype, 'outerHTML', markup);
  const adjacent = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (position, html) { return adjacent.call(this, position, markup(html)); };
  property(CSSStyleDeclaration.prototype, 'cssText', css);
  for (const name of ['background', 'backgroundImage', 'borderImage', 'borderImageSource', 'listStyle', 'listStyleImage', 'cursor', 'mask', 'maskImage']) {
    property(CSSStyleDeclaration.prototype, name, css);
  }
  const setProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) { return setProperty.call(this, name, css(value), priority); };
  const text = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (text?.set && text.configurable) Object.defineProperty(Node.prototype, 'textContent', {
    ...text, set(value) { text.set.call(this, this.nodeName === 'STYLE' ? css(value) : value); },
  });
  const fetch = window.fetch;
  if (fetch) window.fetch = function (input, init) { return fetch.call(this, typeof input === 'string' ? fix(input) : input, init); };
}

function bundle(options) {
  const deck = path.resolve(ROOT, options.deck), out = path.resolve(ROOT, options.out);
  const cache = new Map(), active = new Set(), resources = Object.create(null), fontFiles = [];
  const forbidden = rel => rel.split(/[\\/]/).some(part => part.startsWith('.env') || part === '.wrangler'
    || part === '.codex' || part === '.push_secret' || /\.token$/i.test(part) || /credential/i.test(part));
  function absolute(rel) {
    const candidate = path.resolve(deck, rel);
    const relative = path.relative(deck, candidate);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || forbidden(relative)) {
      throw new Error(`Resource is outside the deck or is a private file: ${rel}`);
    }
    const real = fs.realpathSync(candidate);
    const realRelative = path.relative(fs.realpathSync(deck), real);
    if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || forbidden(realRelative)) throw new Error(`Resource symlink leaves the deck: ${rel}`);
    return candidate;
  }
  const read = rel => fs.readFileSync(absolute(rel));
  function local(raw, base) {
    raw = raw.trim();
    if (!raw || /^(?:data:|blob:|#)/i.test(raw)) return null;
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(raw)) throw new Error(`Offline bundle requires a local resource: ${raw}`);
    const hash = raw.indexOf('#'), suffix = hash < 0 ? '' : raw.slice(hash);
    const pathname = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
    const rel = path.posix.normalize(pathname.startsWith('/') ? pathname.slice(1) : path.posix.join(base, pathname));
    absolute(rel);
    return { rel, suffix };
  }
  function url(raw, base) {
    const target = local(raw, base);
    return target ? resource(target.rel) + target.suffix : raw;
  }
  function css(text, base) {
    // Quoted @import URLs need their own pass; url(...) imports use the same URL
    // rewrite as fonts/images, keeping layer/supports/media clauses verbatim.
    text = text.replace(/(@import\s+)(["'])([^"']+)\2/gi,
      (_, prefix, quote, raw) => `${prefix}url("${url(cssUnescape(raw), base)}")`);
    return text.replace(URL_PATTERN, (all, double, single, bare) => {
      const raw = cssUnescape((double ?? single ?? bare).trim());
      const next = url(raw, base);
      return next === raw ? all : `url("${next}")`;
    });
  }
  function resource(rel) {
    if (cache.has(rel)) return cache.get(rel);
    if (active.has(rel)) throw new Error(`Circular resource import: ${rel}`);
    active.add(rel);
    let bytes = read(rel);
    const ext = path.extname(rel).slice(1).toLowerCase();
    if (ext === 'css') bytes = Buffer.from(css(bytes.toString('utf8'), path.posix.dirname(rel)));
    if (ext === 'js' || ext === 'mjs') {
      let code = bytes.toString('utf8');
      if (/vendor\/mathjax\/.*\.js$/i.test(rel) && code.includes('u.src=u.src.replace(/%%URL%%/,r)')) {
        const hook = 'u.src=u.src.replace(/%%URL%%/,r)';
        if (code.split(hook).length !== 2) throw new Error(`MathJax font hook must occur exactly once: ${rel}`);
        code = code.replace(hook, 'u.src=u.src.replace(/%%URL%%\\/([\\w.-]+)/,function(m,f){return (window.__MJXF&&window.__MJXF[f])||(r+"/"+f)})');
      } else if (/vendor\/mathjax\/tex-chtml.*\.js$/i.test(rel)) {
        throw new Error(`Unsupported MathJax font hook in ${rel}; update the hook before bundling.`);
      }
      if (ext === 'js') new vm.Script(code, { filename: rel });
      bytes = Buffer.from(code);
    }
    const uri = `data:${TYPES[ext] || 'application/octet-stream'};base64,${bytes.toString('base64')}`;
    cache.set(rel, uri); active.delete(rel);
    return uri;
  }
  function walk(rel = '') {
    for (const entry of fs.readdirSync(absolute(rel), { withFileTypes: true })) {
      if (entry.name.startsWith('.') || forbidden(entry.name) || /\.bak/i.test(entry.name)) continue;
      const child = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (ASSET.test(entry.name) || (rel === 'css' && /\.css$/i.test(entry.name))
        || (rel.startsWith('vendor/mathjax/') && /\.js$/i.test(entry.name))) {
        resources[child] = resource(child);
        if (FONT.test(child) && child.startsWith('vendor/mathjax/')) fontFiles.push(child);
      }
    }
  }
  const index = read('index.html').toString('utf8');
  if (/<base\b/i.test(index)) throw new Error('Remove <base> from index.html so resources resolve within the deck folder.');
  const context = vm.createContext({ window: {} });
  new vm.Script(read('slides/order.js').toString('utf8'), { filename: 'slides/order.js' }).runInContext(context, { timeout: 1000 });
  const order = context.window.ORDER;
  if (!Array.isArray(order) || !order.length || !order.every(file => typeof file === 'string' && /\.js$/i.test(file))) {
    throw new Error('slides/order.js must set window.ORDER to a nonempty array of slide filenames.');
  }
  if (new Set(order).size !== order.length) throw new Error('slides/order.js contains duplicate filenames.');
  walk();
  for (const file of order) {
    const rel = path.posix.normalize(path.posix.join('slides', file));
    if (!rel.startsWith('slides/')) throw new Error(`Slide filename must stay in slides/: ${file}`);
    resources[rel] = resource(rel);
  }
  let html = index.replace(TAG_PATTERN, tag => {
    if (tag.startsWith('<!--')) return tag;
    const name = /^<([\w:-]+)/.exec(tag)[1].toLowerCase();
    if (name === 'script') {
      const src = attrOf(tag.slice(0, tag.indexOf('>') + 1), 'src');
      return src === null ? tag : attributes(tag, (attr, value) => attr === 'src' ? url(value, '.') : undefined);
    }
    if (name === 'style') {
      const opening = tag.indexOf('>') + 1, closing = tag.toLowerCase().lastIndexOf('</style');
      return tag.slice(0, opening) + css(tag.slice(opening, closing), '.') + tag.slice(closing);
    }
    const allowed = {
      img: ['src', 'srcset'], source: ['src', 'srcset'], image: ['href', 'xlink:href'], use: ['href', 'xlink:href'],
      video: ['src', 'poster'], audio: ['src'], input: ['src'], track: ['src'], embed: ['src'],
      object: ['data'], iframe: ['src'], link: ['href'],
    }[name] || [];
    return attributes(tag, (attr, value) => attr === 'style' ? css(value, '.')
      : allowed.includes(attr) ? (attr === 'srcset' ? rewriteSrcset(value, raw => url(raw, '.')) : url(value, '.')) : undefined);
  });
  const shim = `${rewriteSrcset.toString()}\n(${installResources.toString()})(${JSON.stringify(resources)},${JSON.stringify(fontFiles)});`;
  if (!/<head\b[^>]*>/i.test(html)) throw new Error('index.html must have a <head> element.');
  html = html.replace(/<head\b[^>]*>/i, head => `${head}\n<script>${scriptEscape(shim)}</script>`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`Bundled ${order.length} slide files, ${cache.size} resources, ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB -> ${path.relative(ROOT, out) || path.basename(out)}`);
}

try {
  const options = argumentsOf(process.argv.slice(2));
  if (options.help) console.log(HELP);
  else bundle(options);
} catch (error) {
  console.error(`bundle: ${error.message}`);
  process.exitCode = 1;
}
