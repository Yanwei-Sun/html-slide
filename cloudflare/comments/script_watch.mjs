#!/usr/bin/env node
import { join } from 'node:path';
import { COMMON_HELP, createClient, parseOptions, pause, readJSON, runCLI, safeError, saveJSON, terminalText } from './lib.mjs';

await runCLI(async () => {
  const options = parseOptions();
  if (options.help) {
    console.log(`Usage: node cloudflare/comments/script_watch.mjs [--once | --list] [--quiet MS] [--interval MS]\n\n--quiet is the time since a note's last save (default 20000 ms).\n--list prints all open edits, including recently saved and previously seen edits.\n\n${COMMON_HELP}`);
    return;
  }
  if (options.positional.length || options.deleteImages) throw new Error('script_watch.mjs takes no positional arguments. Use --help.');
  const client = createClient(options), stateFile = join(client.state, 'script_seen.json');
  function check() {
    const seen = readJSON(stateFile, {});
    if (!seen || typeof seen !== 'object' || Array.isArray(seen)) throw new Error('Invalid script watcher state.');
    const rows = client.sql("SELECT eid, deck, sid, k, text, orig, sent, updated FROM script_edits WHERE deck = 'template' AND status = 'open' ORDER BY updated, eid;");
    const fresh = options.list ? rows : rows.filter(row => seen[row.eid] !== row.updated && Number.isFinite(Date.parse(row.updated)) && Date.now() - Date.parse(row.updated) >= options.quiet);
    for (const row of fresh) {
      console.log(terminalText(`=== SCRIPT EDIT (template) === ${row.sid} click ${row.k} | ${row.updated}\neid: ${row.eid}\norig:\n${row.orig}\nedit:\n${row.text === null ? '(withdrawn)' : row.text}\n`));
      seen[row.eid] = row.updated;
    }
    if (!options.list && fresh.length) saveJSON(stateFile, seen);
    if (!fresh.length && (options.once || options.list)) console.log(rows.length ? `(no new settled script edits; ${rows.length} open, including seen or recently saved edits; --list shows all)` : '(no open script edits)');
    return fresh.length > 0;
  }
  for (;;) {
    try { if (check() || options.once || options.list) return; }
    catch (error) {
      if (options.once || options.list) throw error;
      console.error(`script_watch.mjs: ${safeError(error)} Retrying in ${options.interval} ms.`);
    }
    await pause(options.interval);
  }
});
