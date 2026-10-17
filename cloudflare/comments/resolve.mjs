#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CID, COLS, COMMON_HELP, boxText, createClient, displayPath, durableWrite, fmt, parseBox, parseOptions, q, readImages, runCLI, saveImages, saveJSON } from './lib.mjs';

const inline = value => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+!|]/g, '\\$&');
const block = value => String(value || '(empty)').split(/\r?\n/).map(line => '    ' + line).join('\n');

await runCLI(async () => {
  const options = parseOptions();
  if (options.help) {
    console.log(`Usage: node cloudflare/comments/resolve.mjs CID "Reply describing the fix" [--delete-images]\n\nArchives COMMENTS.md and verified images before marking done. Images stay in D1 unless --delete-images is explicit.\n\n${COMMON_HELP}`);
    return;
  }
  const [cid, ...words] = options.positional, reply = words.join(' ').trim();
  if (!CID.test(cid || '') || !reply || reply.length > 4000 || reply.includes('\0') || options.list || options.once) throw new Error('Provide a comment id and a nonempty reply of at most 4000 characters. Use --help.');
  const client = createClient(options);
  const comment = client.sql(`SELECT ${COLS} FROM comments WHERE cid = ${q(cid)} AND deck = 'template';`)[0];
  if (!comment) throw new Error('That comment was not found in template.');
  const resolved = new Date().toISOString();
  const archive = join(client.state, 'archive'), log = join(archive, 'COMMENTS.md');
  const images = saveImages(readImages(client, cid), cid, join(archive, 'images'));
  const renderedBox = join(client.state, 'attachments', `${cid}_box.png`);
  let boxRender = '';
  if (existsSync(renderedBox)) {
    boxRender = `images/${cid}_box.png`;
    durableWrite(join(archive, boxRender), readFileSync(renderedBox));
  }
  const record = { ...comment, status: 'done', reply, resolved, boxRender, images: images.map(image => ({ ...image, file: 'images/' + basename(image.file) })) };
  const box = parseBox(comment.box);
  const entry = [
    `\n## ${inline(comment.created)} · template · slide ${inline(comment.n)}, click ${inline(comment.k)} (${inline(comment.sid)})`,
    '', `Comment: ${inline(cid)} — ${inline(comment.title)}`, `Author: ${inline(comment.author || '(unnamed)')}`, '', block(comment.text), '',
    ...(box ? [boxText(box), ''] : []),
    ...images.map(image => `Attachment: [${basename(image.file)}](images/${basename(image.file)})`),
    ...(boxRender ? [`Annotated slide: [${cid}_box.png](${boxRender})`] : []),
    '', 'Reply:', '', block(reply), '', `Resolution requested: ${resolved}. The database update is confirmed in the receipt below.`, '',
  ].join('\n');
  const previous = existsSync(log) ? readFileSync(log, 'utf8') : '# Comments archive\n';
  durableWrite(log, previous + entry);
  const receiptFile = join(archive, `${cid}.json`);
  saveJSON(receiptFile, { ...record, databaseConfirmed: false });
  const result = client.sql(`UPDATE comments SET status = 'done', reply = ${q(reply)}, resolved = ${q(resolved)} WHERE cid = ${q(cid)} AND deck = 'template' AND status = ${q(comment.status)} AND reply = ${q(comment.reply)} AND resolved = ${q(comment.resolved)};
SELECT changes() AS changed;
SELECT ${COLS} FROM comments WHERE cid = ${q(cid)} AND deck = 'template';`);
  const stored = result.find(row => row.cid === cid);
  if (result.find(row => Object.hasOwn(row, 'changed'))?.changed !== 1 || stored?.reply !== reply || stored?.resolved !== resolved || stored?.status !== 'done') throw new Error('The comment changed during resolution. The proposed reply and attachments are archived; nothing was deleted. Review it and retry.');
  saveJSON(receiptFile, { ...record, databaseConfirmed: true });
  durableWrite(log, readFileSync(log, 'utf8') + `Database resolution confirmed: ${resolved} (comment ${cid}).\n`);
  if (options.deleteImages && images.length) {
    // Re-read and verify the durable archive before the destructive, explicit step.
    const receipt = JSON.parse(readFileSync(receiptFile, 'utf8'));
    if (!receipt.databaseConfirmed || receipt.images.length !== images.length) throw new Error('Archive receipt verification failed; no attachments were deleted.');
    const current = readImages(client, cid);
    if (current.length !== images.length || current.some(image => !readFileSync(images.find(saved => saved.i === image.i)?.file || '').equals(image.data))) throw new Error('Archive contents changed; no attachments were deleted.');
    client.sql(`DELETE FROM comment_images WHERE cid = ${q(cid)} AND EXISTS (SELECT 1 FROM comments WHERE cid = ${q(cid)} AND deck = 'template' AND status = 'done' AND reply = ${q(reply)} AND resolved = ${q(resolved)});`);
  }
  console.log(fmt(stored));
  console.log('archived: ' + displayPath(log));
  for (const image of images) console.log('archived image: ' + displayPath(image.file));
  if (options.deleteImages && images.length) console.log('Database attachments removed after archive verification.');
});
