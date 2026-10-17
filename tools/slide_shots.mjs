#!/usr/bin/env node
// Screenshot every Deck slide at click 0 through steps, using an installed Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HELP = `Usage: node tools/slide_shots.mjs [--url URL | --deck deck | --html dist/deck.html]
                                [--out DIR] [--chrome PATH] [--width 1600]
                                [--height 900] [--ids M01,U02] [--settle 100]
                                [--click K] [--box x,y,w,h]

Capture each selected slide on entry and after every click. Filenames are
001_M01_click-00.png, 001_M01_click-01.png, etc. manifest.json lists the captures,
slide indices (zero based), click numbers and console/page/resource failures.
The command exits nonzero if rendering, resource loading or image decoding fails.
--click captures just that click on selected slides that have it. --box adds an
orange rectangle using normalized slide coordinates (four numbers from 0 to 1).

Default input: deck/index.html. Default output: .local/shots.
Relative paths resolve from the repository root, regardless of cwd.
Chrome: --chrome, then CHROME_PATH, then conventional installed Chrome/Chromium
locations. No browser is downloaded. file:// inputs run with networking offline.
`;
const TIMEOUT = 60000;

function argumentsOf(argv) {
  const options = { out: '.local/shots', width: 1600, height: 900, settle: 100 };
  let input;
  const names = ['url', 'deck', 'html', 'out', 'chrome', 'width', 'height', 'ids', 'settle', 'click', 'box'];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') return { help: true };
    const match = /^--([\w-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!match || !names.includes(match[1])) throw new Error(`Unknown argument: ${argv[i]}. Use --help.`);
    const name = match[1], value = match[2] ?? argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}.`);
    if (['url', 'deck', 'html'].includes(name)) {
      if (input) throw new Error('Choose only one of --url, --deck and --html.');
      input = name;
    }
    options[name] = value;
  }
  for (const name of ['width', 'height', 'settle']) {
    options[name] = Number(options[name]);
    if (!Number.isSafeInteger(options[name]) || options[name] < (name === 'settle' ? 0 : 1)) throw new Error(`--${name} must be ${name === 'settle' ? 'a nonnegative' : 'a positive'} integer.`);
  }
  options.ids = options.ids ? [...new Set(options.ids.split(',').map(value => value.trim()).filter(Boolean))] : [];
  if (options.click !== undefined) {
    options.click = Number(options.click);
    if (!Number.isSafeInteger(options.click) || options.click < 0) throw new Error('--click must be a nonnegative integer.');
  }
  if (options.box !== undefined) {
    options.box = options.box.split(',').map(Number);
    const [x, y, w, h] = options.box;
    if (options.box.length !== 4 || !options.box.every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) throw new Error('--box must be x,y,w,h within the slide, using normalized coordinates from 0 to 1.');
  }
  if (!input) options.deck = 'deck';
  return options;
}

function chromePath(flag) {
  const specified = flag || process.env.CHROME_PATH;
  if (specified) {
    const candidate = path.resolve(ROOT, specified);
    fs.accessSync(candidate, fs.constants.X_OK);
    return candidate;
  }
  const guesses = process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary']
    : process.platform === 'win32'
      ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).flatMap(base => [path.join(base, 'Google/Chrome/Application/chrome.exe'), path.join(base, 'Chromium/Application/chrome.exe')])
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/google/chrome/chrome'];
  for (const directory of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    guesses.push(...['google-chrome', 'chromium', 'chromium-browser'].map(name => path.join(directory, name)));
  }
  for (const candidate of guesses) {
    try { fs.accessSync(candidate, fs.constants.X_OK); return candidate; } catch { /* try next installed browser */ }
  }
  throw new Error('No installed Chrome found. Pass --chrome PATH or set CHROME_PATH.');
}

function sourceURL(options) {
  if (options.url) {
    const url = new URL(options.url);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('--url must use http://, https:// or file://.');
    return url;
  }
  const filename = path.resolve(ROOT, options.html || path.join(options.deck, 'index.html'));
  fs.accessSync(filename, fs.constants.R_OK);
  return pathToFileURL(filename);
}
const brief = value => String(value).replace(/data:[^\s"'<>)]{120,}/g, '[embedded data]').slice(0, 3000);
const safeID = value => String(value).replace(/[^A-Za-z0-9_.-]+/g, '_') || 'slide';

async function capture(options) {
  const out = path.resolve(ROOT, options.out);
  fs.mkdirSync(out, { recursive: true });
  const manifest = {
    version: 1, startedAt: new Date().toISOString(), source: null,
    viewport: { width: options.width, height: options.height, deviceScaleFactor: 1 },
    settleMs: options.settle, requestedIds: options.ids, requestedClick: options.click ?? null, box: options.box ?? null, slides: [], captures: [], requestedResources: [],
    console: [], pageErrors: [], requestFailures: [], httpErrors: [], resourceErrors: [], renderErrors: [],
  };
  let browser, page, current = null;
  const location = () => current ? { index: current.index, id: current.id, click: current.click } : {};
  try {
    const url = sourceURL(options);
    manifest.source = url.href;
    manifest.offline = url.protocol === 'file:';
    const { chromium } = await import('playwright').catch(() => { throw new Error('Playwright is missing. Run npm install, then retry.'); });
    browser = await chromium.launch({
      executablePath: chromePath(options.chrome), headless: true,
      args: ['--no-first-run', '--no-default-browser-check'],
    });
    const context = await browser.newContext({ viewport: { width: options.width, height: options.height }, deviceScaleFactor: 1, offline: manifest.offline });
    page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT);
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) manifest.console.push({ type: message.type(), message: brief(message.text()), ...location() });
    });
    page.on('pageerror', error => manifest.pageErrors.push({ message: brief(error.message), stack: brief(error.stack || ''), ...location() }));
    page.on('requestfailed', request => manifest.requestFailures.push({ url: brief(request.url()), method: request.method(), resourceType: request.resourceType(), message: brief(request.failure()?.errorText || 'Request failed'), ...location() }));
    page.on('response', response => {
      if (response.status() >= 400) manifest.httpErrors.push({ url: brief(response.url()), status: response.status(), message: response.statusText(), ...location() });
      else if (response.request().resourceType() === 'font' || /\/vendor\//.test(response.url())) manifest.requestedResources.push({ url: brief(response.url()), resourceType: response.request().resourceType(), status: response.status() });
    });
    await page.addInitScript(() => {
      window.__shotResourceErrors = [];
      addEventListener('error', event => {
        const node = event.target;
        if (!node || node === window) return;
        window.__shotResourceErrors.push({ tag: node.tagName, url: node.currentSrc || node.src?.baseVal || node.src || node.href?.baseVal || node.href || '', message: 'Resource failed to load' });
      }, true);
      document.fonts?.addEventListener('loadingerror', event => {
        for (const font of event.fontfaces || []) window.__shotResourceErrors.push({ tag: 'FONT', url: '', message: `Font failed to load: ${font.family} ${font.style} ${font.weight}` });
      });
    });
    await page.goto(url.href, { waitUntil: 'load', timeout: TIMEOUT });
    await page.waitForFunction(() => window.Deck?.ready && Deck.slides?.length > 0, null, { timeout: TIMEOUT });
    manifest.slides = await page.evaluate(() => Deck.slides.map((slide, index) => ({ index, slideNumber: index + 1, id: slide.id, steps: slide.steps || 0, label: slide.label ?? '' })));
    const missing = options.ids.filter(id => !manifest.slides.some(slide => slide.id === id));
    if (missing.length) throw new Error(`Unknown slide IDs: ${missing.join(', ')}`);
    const selected = manifest.slides.filter(slide => (!options.ids.length || options.ids.includes(slide.id)) && (options.click === undefined || options.click <= slide.steps));
    if (!selected.length) throw new Error('No slides selected.');
    const indexDigits = Math.max(3, String(manifest.slides.length).length);
    const clickDigits = Math.max(2, String(Math.max(...selected.map(slide => slide.steps))).length);
    for (const slide of selected) {
      if (!Number.isSafeInteger(slide.steps) || slide.steps < 0) throw new Error(`Invalid step count on ${slide.id}: ${slide.steps}`);
      const firstClick = options.click ?? 0, lastClick = options.click ?? slide.steps;
      for (let click = firstClick; click <= lastClick; click++) {
        current = { ...slide, click };
        try {
          await page.evaluate(async ({ index, click }) => {
            await Deck.go(index, click, false);
            // A jump can cancel an in-flight entry animation. Let its last
            // promise unwind before judging the final, nonanimated state.
            if (Deck.busy?.done) await Deck.busy.done;
            if (window.MathJax?.startup?.promise) await MathJax.startup.promise;
            if (window.MathJax?.typesetPromise) await MathJax.typesetPromise([Deck.slides[index].el]);
            if (document.fonts) await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          }, current);
          if (options.box) await page.evaluate(box => {
            const stage = document.getElementById('stage');
            if (!stage) throw new Error('The deck stage is missing.');
            let marker = document.getElementById('shot-box');
            if (!marker) { marker = document.createElement('div'); marker.id = 'shot-box'; stage.appendChild(marker); }
            const [x, y, w, h] = box;
            marker.style.cssText = `position:absolute;pointer-events:none;z-index:99999;left:${x * 1920}px;top:${y * 1080}px;width:${w * 1920}px;height:${h * 1080}px;box-sizing:border-box;border:5px solid #e8842d;background:rgba(232,132,45,.08);`;
          }, options.box);
          if (options.settle) await page.waitForTimeout(options.settle);
          const failures = await page.evaluate(async expected => {
            const failures = [], checks = window.__shotImageChecks ||= new Map();
            // Decode HTML and SVG images, even on slides currently off screen.
            // Cache each source so repeated clicks do not decode it again.
            const images = [...document.images].map(node => ({ node, url: node.currentSrc || node.src }))
              .concat([...document.querySelectorAll('svg image')].map(node => ({ node, url: node.href?.baseVal || node.getAttribute('href') || node.getAttribute('xlink:href') })));
            await Promise.all(images.filter(image => image.url && !image.url.startsWith('#')).map(async ({ node, url }) => {
              if (!checks.has(url)) checks.set(url, new Promise(resolve => {
                const image = new Image();
                const timer = setTimeout(() => resolve('Image did not finish loading within 15 seconds'), 15000);
                image.onload = () => { clearTimeout(timer); resolve(image.naturalWidth > 0 ? '' : 'Image has zero natural width'); };
                image.onerror = () => { clearTimeout(timer); resolve('Image could not be decoded'); };
                image.src = url;
              }));
              const error = await checks.get(url);
              if (error) failures.push({ tag: node.tagName, url, message: error, slideId: node.closest('.slide')?.dataset.id || '' });
            }));
            for (const font of document.fonts || []) if (font.status === 'error') failures.push({ tag: 'FONT', url: '', message: `Font failed to load: ${font.family} ${font.style} ${font.weight}` });
            if (!Deck.ready || Deck.cur !== expected.index || Deck.step !== expected.click) failures.push({ tag: 'DECK', url: '', message: 'Engine state changed before capture' });
            return failures;
          }, current);
          for (const failure of failures) manifest.resourceErrors.push({ ...failure, url: brief(failure.url), ...location() });
          const file = `${String(slide.slideNumber).padStart(indexDigits, '0')}_${safeID(slide.id)}_click-${String(click).padStart(clickDigits, '0')}.png`;
          await page.screenshot({ path: path.join(out, file), type: 'png', animations: 'disabled', timeout: TIMEOUT });
          manifest.captures.push({ ...slide, click, file });
        } catch (error) {
          manifest.renderErrors.push({ message: brief(error.message), ...location() });
        }
      }
      console.log(`${slide.id}: ${lastClick - firstClick + 1} clicks captured`);
    }
  } catch (error) {
    manifest.renderErrors.push({ message: brief(error.message), ...location() });
  } finally {
    if (page && !page.isClosed()) {
      try {
        const errors = await page.evaluate(() => window.__shotResourceErrors || []);
        for (const error of errors) manifest.resourceErrors.push({ ...error, url: brief(error.url) });
      } catch (error) { manifest.renderErrors.push({ message: brief(error.message) }); }
    }
    try { await browser?.close(); } catch (error) { manifest.renderErrors.push({ message: brief(error.message) }); }
    for (const key of ['console', 'pageErrors', 'requestFailures', 'httpErrors', 'resourceErrors', 'renderErrors']) {
      const seen = new Set();
      manifest[key] = manifest[key].filter(error => {
        const key = JSON.stringify([error.type, error.message, error.url, error.status, error.tag, error.slideId]);
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    }
    manifest.requestedResources = [...new Map(manifest.requestedResources.map(resource => [resource.url, resource])).values()];
    manifest.finishedAt = new Date().toISOString();
    manifest.errorCount = manifest.console.filter(message => message.type === 'error').length
      + manifest.pageErrors.length + manifest.requestFailures.length + manifest.httpErrors.length
      + manifest.resourceErrors.length + manifest.renderErrors.length;
    manifest.ok = manifest.errorCount === 0 && manifest.captures.length > 0;
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`${manifest.captures.length} PNGs; ${manifest.errorCount} errors -> ${path.relative(ROOT, out) || '.'}/manifest.json`);
    if (!manifest.ok) {
      for (const error of [...manifest.renderErrors, ...manifest.pageErrors, ...manifest.console.filter(message => message.type === 'error'), ...manifest.resourceErrors, ...manifest.requestFailures, ...manifest.httpErrors].slice(0, 8)) console.error(brief(error.message || error.url));
      process.exitCode = 1;
    }
  }
}

try {
  const options = argumentsOf(process.argv.slice(2));
  if (options.help) console.log(HELP);
  else await capture(options);
} catch (error) {
  console.error(`slide_shots: ${error.message}`);
  process.exitCode = 1;
}
