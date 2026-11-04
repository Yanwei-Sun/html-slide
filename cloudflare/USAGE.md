# The shared review site

The site contains one deck, called `template`. It adds a shared passcode gate, per-slide comments with boxes and images, author replies, script editing, and a one-deck chooser at `/decks`. The standalone deck and offline bundle work without Cloudflare; their Comment button explains where shared comments are available.

Run these commands from the repository root. `bash cloudflare/publish.sh` and `npm run cf:stage` only build `cloudflare/site/`. They never create resources or deploy. Pages Functions live beside that output in `cloudflare/functions/`; keep source files outside the public `site/` folder.

## Try everything locally

Install the repository dependencies first. Manually create the ignored file `cloudflare/.dev.vars` with values you choose:

```text
PASSCODE="choose-your-own-passcode"
COOKIE_SECRET="choose-a-long-random-cookie-signing-secret"
```

Both values are required. Without them the site fails closed with a setup page. The secret signs the seven-day session cookie; changing either value invalidates existing sessions. Cookies are HttpOnly and SameSite=Lax, with Secure on HTTPS. Local HTTP works too.

The committed Wrangler config has a generic database name and no database ID. It is ready for local D1:

```sh
npm run cf:stage
npx wrangler d1 execute html-slide-comments --local \
  --config cloudflare/wrangler.toml \
  --persist-to cloudflare/.wrangler/state \
  --file cloudflare/comments/schema.sql
npm run cf:dev
```

Open the local address printed by Wrangler, enter your chosen passcode, and try a comment (`c`) or the script (`s` twice). Pages dev runs locally; its current CLI has no `--local` flag. The D1 command explicitly uses `--local`. Keep the same persistence directory for schema setup, Pages dev and the tools below. Run Pages dev from `cloudflare/` so it finds the sibling `functions/` folder. The package command does this and passes `--d1 COMMENTS_DB`, which explicitly binds the same local database used by the schema and author tools. A database ID is not needed for this local binding.

All three empty tables are needed: `comments`, `comment_images`, and `script_edits`. Runtime state, downloaded attachments and archives belong in ignored directories, never in Git.

## Create your own shared site

Use your own Cloudflare account. These are setup instructions; none runs as part of staging:

```sh
npx wrangler login
npx wrangler pages project create your-pages-project --production-branch main
cp cloudflare/wrangler.toml cloudflare/wrangler.user.toml
npx wrangler d1 create html-slide-comments --config cloudflare/wrangler.user.toml
```

In the ignored `cloudflare/wrangler.user.toml`, set `name` to your Pages project name and add the `database_id` returned by the create command under `[[d1_databases]]`. Keep `binding = "COMMENTS_DB"`. If you choose another database name, change `database_name` there too and use that name in the commands below. Keep your account and database identifiers out of the committed config.

```sh
npx wrangler d1 execute html-slide-comments --remote \
  --config cloudflare/wrangler.user.toml --file cloudflare/comments/schema.sql
npx wrangler pages secret put PASSCODE --project-name your-pages-project
npx wrangler pages secret put COOKIE_SECRET --project-name your-pages-project
```

Enter the two values interactively when prompted. Pages secrets can be set after creating the project and before its first deployment. Then build and deploy explicitly:

```sh
CF_PROJECT_NAME=your-pages-project \
CF_CONFIG=cloudflare/wrangler.user.toml \
bash cloudflare/publish.sh deploy
```

`CF_CONFIG` is relative to the repository root, or an absolute path to your own config. Explicit deployment requires both it and `CF_PROJECT_NAME`. Pages does not accept a custom `--config` path, so the script copies your selected config, site and functions into an ignored temporary deployment folder with a canonical `wrangler.toml`, then removes that folder on exit. `CF_BRANCH` defaults to `main`; `CLOUDFLARE_ACCOUNT_ID`, if needed to select your own account, comes from your environment. No account or database IDs are embedded in the template. Share the resulting Pages link and the passcode with your coauthors.

## Pull comments and reply

The author tools use **local D1 by default**. For the shared site, add `--remote --config cloudflare/wrangler.user.toml` to each command. There is no automatic remote fallback.

```sh
node cloudflare/comments/watch.mjs --once
node cloudflare/comments/watch.mjs --list
node cloudflare/comments/watch.mjs --once --render-box
node cloudflare/comments/resolve.mjs COMMENT_ID "Updated that slide and republished."
```

The watcher prints each comment's slide, click, text, image attachments and box coordinates. It saves new attachments in ignored `work/cloudflare/`. Optional `--render-box` uses an installed Chrome to save an annotated slide PNG; it is not needed to pull or resolve comments. Without `--once` or `--list`, the watcher waits for a new batch, prints it, and exits so an inbox or coding agent can consume it.

`--list` includes open and completed comments. Resolve archives the comment and verified images before marking it done. The coauthor sees the reply after the panel refreshes. Images remain in D1 by default. Optional `--delete-images` removes them only after a second archive verification. The archive is `archive/COMMENTS.md` plus image files and a receipt under the invocation's `work/cloudflare/` state folder.

## Pull coauthor script edits

Coauthors open the script (`s` twice), click a note and edit it. The browser first reads shared note versions, then saves your edits locally and submits them in order. If another coauthor saves the same note first, your text stays in this browser and a comparison card lets you use the shared version or explicitly save your version after review. The author reviews, applies, rebuilds and publishes:

```sh
node cloudflare/comments/script_watch.mjs --list
node cloudflare/comments/apply_note.mjs --dry-run
node cloudflare/comments/apply_note.mjs
npm run cf:stage
```

Use the same `--remote --config cloudflare/wrangler.user.toml` flags for edits from the shared site, then deploy explicitly as above. Applying compares each current slide note against the edit's original text. A conflict leaves the whole batch untouched. Successful application refreshes unchanged `SCRIPT.md` blocks and preserves pending local edits there. An edit is acknowledged only if its timestamp still matches. A newer edit stays open for review. Repeating after an interrupted acknowledgement recognizes already-applied notes safely.

To apply one reviewed version, use the edit ID and exact timestamp printed by the watcher:

```sh
node cloudflare/comments/apply_note.mjs \
  --only 'template|M01|0' --at 'COPY_THE_UPDATED_TIMESTAMP' --dry-run
```

Remove `--dry-run` after review. `--deck PATH --script PATH` selects a separate working copy. `script_watch.mjs --once --quiet 0` checks immediately; normal polling waits 20 seconds after each note's last save, including the newest slide. `--list` ignores quiet time and seen state.

## Shared tool options

| Option | Meaning |
| --- | --- |
| `--local` | Local D1; the default |
| `--remote` | Explicitly use your configured remote D1 |
| `--config PATH` | Wrangler config, relative to the repository root |
| `--persist-to PATH` | Local D1 storage; default `cloudflare/.wrangler/state` |
| `--database NAME` | Database name; also configurable with `CF_DATABASE_NAME` |
| `--interval MS` | Watch polling interval in milliseconds |

`--persist-to` is rejected with remote mode. State is separated by mode, config, database and persistence directory under ignored `work/cloudflare/`. Wrangler logs also stay there, metrics are disabled, and raw Wrangler error output is not echoed. `WRANGLER` can point to a wrapper executable for an isolated local test harness.

The API preserves the deck widget's contracts: `GET/POST /__comments`, `GET /__comments/img?cid=...&i=0`, and `GET/POST /__script`. Comments accept optional `box` and `images`, defaulting to `null` and `[]`; replies are stored on their original comment row. Script POSTs require `updated`: `null` when no open edit exists, otherwise the exact revision read from `GET /__script` or returned by the previous successful save. Missing revisions are rejected; stale saves return 409 with the current open version. `GET /__script` returns applied rows under `rows` and current open versions under `open`. Script edits include `orig` and retain the submitted text as `sent` so the browser can drop its local copy after the updated deck is published. Manual HTTP clients must send a matching Origin and session cookie for writes.

Image uploads are checked against their encoded PNG, JPEG or static WebP headers and container structure. Dimensions come from the file, and any supplied dimensions must match. Each image must be at most 1.5 MB, 8192 pixels per side and 16 million pixels.
