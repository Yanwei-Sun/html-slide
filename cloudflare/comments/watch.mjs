#!/usr/bin/env node
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { COLS, COMMON_HELP, ROOT, createClient, displayPath, durableWrite, fmt, parseBox, parseOptions, pause, readImages, readJSON, runCLI, safeError, saveImages, saveJSON } from './lib.mjs';

await runCLI(async () => {
  const options = parseOptions();
  if (options.help) {
    console.log(`Usage: node cloudflare/comments/watch.mjs [--once | --list] [--interval MS] [--render-box]\n\n--render-box optionally renders annotated slide PNGs using an installed Chrome.\n\n${COMMON_HELP}`);
    return;
  }
  if (options.positional.length || options.deleteImages) throw new Error('watch.mjs takes no positional arguments. Use --help.');
  const client = createClient(options), stateFile = join(client.state, 'seen.json');
  function renderBox(comment) {
    const box = parseBox(comment.box);
    if (!box) return;
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(comment.sid) || !Number.isInteger(comment.k) || comment.k < 0) throw new Error('Invalid slide reference for a box render.');
    const out = join(client.state, 'renders', comment.cid);
    execFileSync(process.execPath, [join(ROOT, 'tools', 'slide_shots.mjs'), '--deck', join(ROOT, 'deck'), '--out', out,
      '--ids', comment.sid, '--click', String(comment.k), '--box', [box.x / 1920, box.y / 1080, box.w / 1920, box.h / 1080].join(',')], {
      cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000, maxBuffer: 4 * 1024 * 1024,
    });
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    if (!manifest.ok || manifest.captures.length !== 1 || /[\\/]/.test(manifest.captures[0].file)) throw new Error('The annotated slide did not render cleanly.');
    const file = join(client.state, 'attachments', `${comment.cid}_box.png`);
    durableWrite(file, readFileSync(join(out, manifest.captures[0].file)));
    console.log('box render: ' + displayPath(file));
  }
  function check() {
    const savedSeen = readJSON(stateFile, []);
    if (!Array.isArray(savedSeen) || savedSeen.some(value => typeof value !== 'string')) throw new Error('Invalid comment watcher state.');
    const seen = new Set(savedSeen);
    const rows = client.sql(`SELECT ${COLS} FROM comments WHERE deck = 'template'${options.list ? '' : " AND status = 'open'"} ORDER BY created, cid;`);
    const fresh = options.list ? rows : rows.filter(row => !seen.has(row.cid));
    for (const comment of fresh) {
      console.log(fmt(comment));
      const images = readImages(client, comment.cid);
      for (const image of images) console.log(`image ${image.i}: ${image.mime} ${image.w ?? '?'}x${image.h ?? '?'} ${(image.bytes / 1024).toFixed(1)} KB`);
      for (const image of saveImages(images, comment.cid, join(client.state, 'attachments'))) console.log('saved: ' + displayPath(image.file));
      if (options.renderBox) {
        try { renderBox(comment); }
        catch (error) { console.log('box render: ' + safeError(error) + ' Box coordinates remain available above.'); }
      }
      console.log('');
      if (!options.list) seen.add(comment.cid);
    }
    if (!options.list && fresh.length) saveJSON(stateFile, [...seen].sort());
    if (!fresh.length && (options.once || options.list)) console.log(options.list ? '(no comments)' : '(no new open comments)');
    return fresh.length > 0;
  }
  for (;;) {
    try { if (check() || options.once || options.list) return; }
    catch (error) {
      if (options.once || options.list) throw error;
      console.error(`watch.mjs: ${safeError(error)} Retrying in ${options.interval} ms.`);
    }
    await pause(options.interval);
  }
});
