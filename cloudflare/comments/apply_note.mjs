#!/usr/bin/env node
// Apply reviewed shared notes with the same conflict checks as the local SCRIPT workflow.
import path from 'node:path';
import { applyNoteEdits, refreshScript } from '../../tools/script.mjs';
import { COMMON_HELP, ROOT, createClient, parseOptions, q, runCLI, terminalText } from './lib.mjs';

function argumentsForApply(argv) {
  const custom = { dryRun: false, only: '', at: '', deck: path.join(ROOT, 'deck'), script: path.join(ROOT, 'SCRIPT.md') };
  const shared = [];
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--dry' || argument === '--dry-run') { custom.dryRun = true; continue; }
    const equals = argument.indexOf('='), flag = equals < 0 ? argument : argument.slice(0, equals);
    if (['--only', '--at', '--deck', '--script'].includes(flag)) {
      const value = equals < 0 ? argv[++index] : argument.slice(equals + 1);
      if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value.`);
      const key = flag.slice(2);
      custom[key] = ['deck', 'script'].includes(key) ? path.resolve(ROOT, value) : value;
    } else shared.push(argument);
  }
  return { ...parseOptions(shared), ...custom };
}

await runCLI(async () => {
  const options = argumentsForApply(process.argv.slice(2));
  if (options.help) {
    console.log(`Usage: node cloudflare/comments/apply_note.mjs [--dry-run] [--only EID --at UPDATED]\n\nWrites open template script edits to deck/slides and refreshes unchanged SCRIPT.md blocks.\nConflicting original notes leave the whole batch untouched. Null edits are withdrawals.\n--only requires the exact updated timestamp printed by script_watch.mjs.\n--deck PATH and --script PATH select a separate working copy.\n\n${COMMON_HELP}`);
    return;
  }
  if (options.positional.length || options.once || options.list || options.deleteImages) throw new Error('Use --dry-run, --only/--at, or the shared D1 options. See --help.');
  if (options.at && !options.only) throw new Error('--at requires --only.');
  if (options.only && (!/^template\|[A-Za-z0-9_-]{1,60}\|\d{1,3}$/.test(options.only) || !options.at || !Number.isFinite(Date.parse(options.at)))) throw new Error('--only needs an edit id and its exact --at timestamp from script_watch.mjs.');
  const client = createClient(options);
  const rows = client.sql(`SELECT eid, sid, k, text, orig, updated FROM script_edits WHERE deck = 'template' AND status = 'open'${options.only ? ` AND eid = ${q(options.only)}` : ''} ORDER BY updated, eid;`);
  if (!rows.length) { console.log('(no open script edits)'); return; }
  if (options.only && rows.some(row => row.updated !== options.at)) throw new Error('That edit changed after review. Run script_watch.mjs --list and review the latest version.');
  for (const row of rows) if (row.eid !== `template|${row.sid}|${row.k}` || typeof row.orig !== 'string' || !Number.isInteger(row.k)) throw new Error('An edit has invalid metadata; nothing was applied.');
  const changes = rows.filter(row => row.text !== null);
  const result = applyNoteEdits(options.deck, changes.map(({ sid, k, orig, text }) => ({ sid, k, orig, text })), { dryRun: options.dryRun });
  if (result.conflicts.length) throw new Error(result.conflicts.map(item => `${item.sid || 'batch'}.${item.k ?? ''}: ${item.reason}`).join('; '));
  for (const row of rows) console.log(terminalText(`${options.dryRun ? 'WOULD APPLY' : row.text === null ? 'WITHDRAWN' : 'APPLIED'} ${row.eid} (${row.updated})${row.text === null ? ' — no source change' : ''}`));
  if (options.dryRun) { console.log('Dry run: no slide, script or database changes.'); return; }
  // A failed refresh leaves edits open, so retry can acknowledge already-applied source safely.
  if (changes.length) {
    const refreshed = refreshScript(options.deck, options.script);
    console.log(`SCRIPT.md: refreshed ${refreshed.refreshed} blocks; preserved ${refreshed.preserved} pending local edits.`);
  }
  const applied = new Date().toISOString();
  const updates = rows.map(row => `UPDATE script_edits SET status = 'done', applied = ${q(applied)} WHERE eid = ${q(row.eid)} AND deck = 'template' AND status = 'open' AND updated = ${q(row.updated)} AND orig = ${q(row.orig)};`);
  const stored = client.sql(updates.join('\n') + `\nSELECT eid, updated, status, applied FROM script_edits WHERE deck = 'template' AND eid IN (${rows.map(row => q(row.eid)).join(', ')});`);
  const pending = rows.filter(row => !stored.some(saved => saved.eid === row.eid && saved.updated === row.updated && saved.status === 'done'));
  if (pending.length) throw new Error(`${pending.length} edits changed during application and remain open. Review them with script_watch.mjs --list before retrying.`);
  console.log(`Marked ${rows.length} shared edits done. Bundle and publish to update the shared deck.`);
});
