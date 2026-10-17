import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '../..');
export const CF = resolve(HERE, '..');
export const WORK = join(ROOT, 'work', 'cloudflare');
export const CID = /^[0-9a-z]{9}-[0-9a-f]{8}$/;
export const COLS = 'cid, deck, n, k, sid, title, author, text, created, status, reply, resolved, box';
export const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const WRANGLER = process.env.WRANGLER || join(ROOT, 'node_modules', '.bin', 'wrangler');

const pathOption = value => isAbsolute(value) ? resolve(value) : resolve(ROOT, value);
const milliseconds = (name, value, minimum = 0) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum || Number(value) > 86_400_000) throw new Error(`${name} expects milliseconds between ${minimum} and 86400000.`);
  return Number(value);
};

// Consume shared and tool flags before returning any positional arguments.
export function parseOptions(argv = process.argv.slice(2)) {
  const options = {
    mode: 'local', config: join(CF, 'wrangler.toml'), persistTo: join(CF, '.wrangler', 'state'),
    database: process.env.CF_DATABASE_NAME || 'html-slide-comments',
    once: false, list: false, interval: 20_000, quiet: 20_000, deleteImages: false, renderBox: false,
    help: false, positional: [],
  };
  let chosenMode, explicitPersist = false;
  const values = new Map([
    ['--config', ['config', pathOption]], ['--persist-to', ['persistTo', pathOption]],
    ['--database', ['database', value => value]],
    ['--interval', ['interval', value => milliseconds('--interval', value, 500)]],
    ['--quiet', ['quiet', value => milliseconds('--quiet', value)]],
  ]);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--') { options.positional.push(...argv.slice(index + 1)); break; }
    if (argument === '--local' || argument === '--remote') {
      const mode = argument.slice(2);
      if (chosenMode && chosenMode !== mode) throw new Error('Choose either --local or --remote.');
      options.mode = chosenMode = mode;
      continue;
    }
    const boolean = { '--once': 'once', '--list': 'list', '--delete-images': 'deleteImages', '--render-box': 'renderBox', '--help': 'help', '-h': 'help' }[argument];
    if (boolean) { options[boolean] = true; continue; }
    const equals = argument.indexOf('='), flag = equals < 0 ? argument : argument.slice(0, equals);
    if (values.has(flag)) {
      const value = equals < 0 ? argv[++index] : argument.slice(equals + 1);
      if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value.`);
      const [key, parse] = values.get(flag);
      options[key] = parse(value);
      if (flag === '--persist-to') explicitPersist = true;
      continue;
    }
    if (argument.startsWith('-')) throw new Error('Unknown option. Use --help for the supported flags.');
    options.positional.push(argument);
  }
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(options.database)) throw new Error('Use a database name containing letters, numbers, underscores or hyphens.');
  if (options.mode === 'remote' && explicitPersist) throw new Error('--persist-to is only available with --local.');
  return options;
}

export const COMMON_HELP = `D1 options (available on every tool):
  --local                 Local D1 only; the default
  --remote                Explicitly use the configured remote D1
  --config PATH           Wrangler config, relative to the repository
  --persist-to PATH       Local D1 storage, relative to the repository
  --database NAME         D1 name (or CF_DATABASE_NAME)
Defaults: cloudflare/wrangler.toml; cloudflare/.wrangler/state; html-slide-comments.
State, logs and archives: work/cloudflare/ (keep this directory ignored).`;

export function displayPath(file) {
  const value = relative(ROOT, file);
  return !isAbsolute(value) && value !== '..' && !value.startsWith('..' + sep) ? value.split(sep).join('/') || '.' : '(external path)';
}
export const terminalText = value => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
export function safeError(error) {
  const message = terminalText(error?.message || error).split('\n')[0];
  return message.replace(/(?:[A-Za-z]:[\\/]|\/)[^\s'"<>]+/g, '[path]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]');
}

export function q(value) {
  const text = String(value);
  if (text.includes('\0')) throw new Error('SQL text contains a NUL character.');
  return "'" + text.replace(/'/g, "''") + "'";
}

export function d1Arguments(statement, options) {
  const args = ['d1', 'execute', options.database, '--' + options.mode, '--config', options.config];
  if (options.mode === 'local') args.push('--persist-to', options.persistTo);
  return [...args, '--json', '--command', statement];
}

export function sql(statement, options = parseOptions([])) {
  if (!existsSync(WRANGLER)) throw new Error('Wrangler is missing. Install the repository dependencies first.');
  const logs = join(WORK, 'logs');
  mkdirSync(logs, { recursive: true });
  let stdout;
  try {
    stdout = execFileSync(WRANGLER, d1Arguments(statement, options), {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env, WRANGLER_SEND_METRICS: 'false', NODE_DISABLE_COMPILE_CACHE: '1',
        WRANGLER_LOG_PATH: join(logs, 'wrangler.log'),
      },
    });
  } catch {
    // Wrangler stderr can contain account identifiers and absolute paths.
    throw new Error(`D1 ${options.mode} command failed. Check the config, schema and ignored work/cloudflare/logs/wrangler.log.`);
  }
  let results;
  try {
    const start = stdout.search(/^\s*\[/m);
    if (start < 0) throw new Error();
    results = JSON.parse(stdout.slice(start));
  } catch { throw new Error('Wrangler did not return a D1 JSON result.'); }
  if (!Array.isArray(results) || results.some(result => result.success === false || !Array.isArray(result.results))) throw new Error('D1 returned an unsuccessful result.');
  return results.flatMap(result => result.results);
}

export function createClient(options) {
  const scope = createHash('sha256').update(JSON.stringify([options.mode, options.config, options.persistTo, options.database])).digest('hex').slice(0, 12);
  const state = join(WORK, `${options.mode}-${scope}`);
  return { options, state, sql: statement => sql(statement, options) };
}

export function readJSON(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { throw new Error(`Invalid saved state in ${displayPath(file)}. Move that state file aside before retrying.`); }
}

// Flush archives to disk before a caller is allowed to delete database images.
export function durableWrite(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = file + '.' + randomBytes(6).toString('hex') + '.tmp';
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, data);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, file);
    const directory = openSync(dirname(file), 'r');
    try { fsyncSync(directory); }
    catch (error) { if (!['EINVAL', 'ENOTSUP'].includes(error.code)) throw error; }
    finally { closeSync(directory); }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}
export const saveJSON = (file, value) => durableWrite(file, JSON.stringify(value, null, 2) + '\n');

export function parseBox(value) {
  try {
    const box = typeof value === 'string' ? JSON.parse(value) : value;
    return box && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(box[key])) && box.x >= 0 && box.y >= 0 && box.w >= 1 && box.h >= 1 && box.x + box.w <= 1920 && box.y + box.h <= 1080 ? box : null;
  } catch { return null; }
}
export const boxText = box => box ? `box: x=${box.x} y=${box.y} w=${box.w} h=${box.h} (1920x1080 slide coordinates)` : '';
export const fmt = comment => terminalText([
  `=== COMMENT (template) === #${comment.n}.${comment.k} (${comment.sid}) ${comment.title}`,
  `by ${comment.author || '(unnamed)'} | ${comment.created} | ${comment.status}`,
  comment.text || '(no text)', boxText(parseBox(comment.box)),
  `reference: open deck/index.html; slide ${comment.n} (${comment.sid}), click ${comment.k}`,
  `cid: ${comment.cid}`,
  ...(comment.reply ? [`reply (${comment.resolved || 'pending'}): ${comment.reply}`] : []),
].filter(Boolean).join('\n'));

export function readImages(client, cid) {
  if (!CID.test(cid)) throw new Error('Invalid comment id.');
  return client.sql(`SELECT i, mime, w, h, bytes, hex(data) AS hx FROM comment_images WHERE cid = ${q(cid)} ORDER BY i;`).map(row => {
    if (!Number.isInteger(row.i) || row.i < 0 || row.i > 3 || !Object.hasOwn(EXTENSIONS, row.mime) || typeof row.hx !== 'string' || row.hx.length > 3 * 1024 * 1024 || !/^(?:[0-9a-f]{2})+$/i.test(row.hx)) throw new Error('Invalid attachment data; no database attachments were deleted.');
    const data = Buffer.from(row.hx, 'hex');
    if (data.length !== row.bytes) throw new Error('Attachment size mismatch; no database attachments were deleted.');
    return { ...row, data };
  });
}

export function saveImages(images, cid, directory) {
  if (!CID.test(cid)) throw new Error('Invalid comment id.');
  return images.map(image => {
    const file = join(directory, `${cid}_${image.i}.${EXTENSIONS[image.mime]}`);
    durableWrite(file, image.data);
    if (!readFileSync(file).equals(image.data)) throw new Error('Archive verification failed; no database attachments were deleted.');
    return { file, i: image.i, mime: image.mime, bytes: image.bytes, sha256: createHash('sha256').update(image.data).digest('hex') };
  });
}

export const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
export async function runCLI(main) {
  try { await main(); }
  catch (error) { console.error(safeError(error)); process.exitCode = 1; }
}
