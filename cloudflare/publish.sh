#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-stage}"
if [[ $# -gt 1 || ( "$ACTION" != stage && "$ACTION" != deploy ) ]]; then
  echo 'Usage: bash cloudflare/publish.sh [stage|deploy]' >&2
  exit 2
fi
if [[ "$ACTION" == deploy && -z "${CF_PROJECT_NAME:-}" ]]; then
  echo 'Explicit deploy needs CF_PROJECT_NAME in your environment.' >&2
  exit 2
fi
if [[ "$ACTION" == deploy && -z "${CF_CONFIG:-}" ]]; then
  echo 'Explicit deploy needs CF_CONFIG pointing to your own ignored Wrangler config.' >&2
  exit 2
fi
if [[ "$ACTION" == deploy && ! "${CF_PROJECT_NAME}" =~ ^[a-z0-9][a-z0-9-]{0,57}$ ]]; then
  echo 'CF_PROJECT_NAME must be a Pages project name using lowercase letters, numbers and hyphens.' >&2
  exit 2
fi

CF_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$CF_DIR/.." && pwd)"
cd -- "$REPO_DIR"
export WRANGLER_SEND_METRICS=false
export NODE_DISABLE_COMPILE_CACHE=1
export WRANGLER_LOG_PATH="$REPO_DIR/work/cloudflare/logs/publish.log"

# The bundled HTML contains its assets. Never stage source files as public assets.
node --input-type=module <<'NODE'
import fs from 'node:fs';
const directory = 'cloudflare/site';
if (fs.existsSync(directory)) {
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('The generated site directory must not be a symlink.');
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !['index.html', '_routes.json', '__version.txt'].includes(entry.name)) {
      throw new Error('Unexpected files in cloudflare/site. Move them aside before staging.');
    }
  }
}
if (!fs.existsSync('cloudflare/functions/_middleware.js')) throw new Error('The Pages middleware is missing.');
fs.mkdirSync(directory, { recursive: true });
NODE

node tools/bundle.mjs --out cloudflare/site/index.html

node --input-type=module <<'NODE'
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const html = fs.readFileSync('cloudflare/site/index.html');
if (!html.length) throw new Error('The bundle is empty.');
fs.writeFileSync('cloudflare/site/_routes.json', JSON.stringify({ version: 1, include: ['/*'], exclude: [] }, null, 2) + '\n');
fs.writeFileSync('cloudflare/site/__version.txt', 'sha256-' + createHash('sha256').update(html).digest('hex').slice(0, 24) + '\n');
NODE
echo 'Staged cloudflare/site/index.html, _routes.json and __version.txt.'
echo 'Pages Functions: cloudflare/functions (discovered by Wrangler from cloudflare/).'

if [[ "$ACTION" == stage ]]; then
  exit 0
fi

WRANGLER_BIN="$REPO_DIR/node_modules/.bin/wrangler"
if [[ ! -x "$WRANGLER_BIN" ]]; then
  echo 'Wrangler is missing. Install the repository dependencies first.' >&2
  exit 1
fi
mkdir -p -- "$REPO_DIR/work/cloudflare/logs"
CF_CONFIG_PATH="$CF_CONFIG"
if [[ "$CF_CONFIG_PATH" != /* ]]; then
  CF_CONFIG_PATH="$REPO_DIR/$CF_CONFIG_PATH"
fi
if [[ ! -f "$CF_CONFIG_PATH" || "$CF_CONFIG_PATH" != *.toml ]]; then
  echo 'CF_CONFIG must name your own Wrangler TOML config.' >&2
  exit 2
fi
# Pages discovers only a canonical Wrangler config; --config is unsupported.
# This ignored staging directory keeps private deployment identifiers out of source.
DEPLOY_DIR="$(mktemp -d "$REPO_DIR/work/cloudflare/publish.XXXXXX")"
trap 'rm -rf -- "$DEPLOY_DIR"' EXIT
cp -- "$CF_CONFIG_PATH" "$DEPLOY_DIR/wrangler.toml"
cp -R -- "$CF_DIR/site" "$DEPLOY_DIR/site"
cp -R -- "$CF_DIR/functions" "$DEPLOY_DIR/functions"
cd -- "$DEPLOY_DIR"
# The user's environment supplies any account selection. No account is embedded here.
"$WRANGLER_BIN" pages deploy site \
  --project-name "$CF_PROJECT_NAME" --branch "${CF_BRANCH:-main}" \
  --commit-dirty=true --commit-message 'html-slide deployment'
