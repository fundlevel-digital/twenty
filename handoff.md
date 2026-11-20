# Handoff: Fundlevel Twenty CRM ("Twenty - Fundlevel Dashboard" session)

Last updated 2026-11-19. Nothing is running in the background. Everything below is either shipped and deployed or listed under open items.

## Environment

- **CRM:** https://crm.fundlevel.co. The workspace subdomain is `crm`. The real `SERVER_URL` is `https://crm-login.fundlevel.co` (multi-workspace, `DEFAULT_SUBDOMAIN=crm-login`).
- **Host:** `ssh claudy`.
  - Compose project `fundlevel-twenty-trial`, deploy dir `/mnt/storage/twenty-crm`.
  - Data lives in Docker volumes.
  - Workspace id `3b424be9-f8da-41b6-b564-16c9da2df4e1`, schema `workspace_3iaq1z1s1jv5ol6qhlcwulwbl`.
  - The server is published on `127.0.0.1:3350`.
- **Never take backups or pg_dumps on claudy,** not even before deploys. This is an owner rule.
- **Git remotes:**
  - `org` = fundlevel-digital/twenty, where builds run.
  - `origin` = kareem717/twenty, a mirror.
  - `upstream` = twentyhq/twenty.
  - This branch is `fundlevel/dashboard-lookups-youtube-analytics`, the same as `main` plus this file.
- **Commit messages:** no AI attribution.
- **Typechecks on the owner's 16 GB Mac:** never run full typechecks, nx, or parallel heavy jobs. Use a trimmed tsconfig that lists only the changed files, run with `tsgo` under `GOMAXPROCS=1 GOMEMLIMIT=3GiB`, plus a watchdog that kills it above 5 GB. Run jest one file at a time with `--runInBand`.

## Build and deploy

- **Builds:** `.github/workflows/fundlevel-build.yaml` runs on Boat (`runs-on: boat`, about 17 minutes) for every push to `main` on the `org` remote. It publishes the private images `ghcr.io/fundlevel-digital/twenty:<sha>` and `:main`.
  - claudy is `docker login`ed to ghcr as kareem717 with a classic token that has `read:packages`.
  - All 58 upstream workflows are disabled on the org repo. Workflow files that arrive later from upstream merges will be enabled and must be disabled again; keep only `fundlevel-build.yaml` on.
- **Deploy:**
  1. `docker pull ghcr.io/fundlevel-digital/twenty:<sha>` on claudy.
  2. Set the image on lines 4 and 65 of `/mnt/storage/twenty-crm/docker-compose.yml`.
  3. `docker compose up -d server worker`. The entrypoint runs the upgrades.
- **Currently deployed:** `ghcr.io/fundlevel-digital/twenty:0c66619c07687adf3195745ee16ca1540ba0e953`. Commit `91e6edbf31` only adds an app package; there are no server changes after `0c66619c07`.
- **Rollback images:** `fundlevel-twenty:v2.60.0-fundlevel.4` and `fundlevel-twenty:rollback-v2.50.0`.
- **Upgrade-cursor gotcha:** within a version, instance commands sort before workspace commands. A fork-added instance command in a version whose workspace command has already run is skipped silently. This hit 2.59 `1794606690417` and 2.60 `1794924648050`.
  - After each deploy, compare `core."upgradeMigration"` with the image's commands.
  - Apply any skipped command by hand.
  - Record one instance row (`workspaceId` null) plus one row per workspace (3 workspaces), and back-date `createdAt` to sit before newer rows. Otherwise the server hides that command's columns.

## Shipped commits (all on `main`, all deployed)

| Commit | What |
|---|---|
| `e8d33cb03d` | LinkedIn app: Unipile hosted-auth link lets members set a proxy and country at sign-in; chat lists are paged at 25 (fixes "limit ≤ 25"). Applied with `twenty app apply`. |
| `f211664c4d` | App OAuth callback forwards to the workspace host when the flow cookie is missing (fixes Fathom "must finish in the browser that started it"). |
| `edbcbeac32` | Multi-level lookup columns: `viewField.relationPathFieldMetadataIds` (jsonb), up to 5 hops, at most one one-to-many hop, allowed in TABLE_WIDGET views, settable by AI tools. `CONNECTION_MAX_DEPTH` raised to 6. |
| `f3955b2930` | Boat build workflow. |
| `0c66619c07` | View-field validation loads the apps that own lookup path hop fields (a hop such as `person.lastEmail` from the "Last contact" app was rejected). |
| `91e6edbf31` | YouTube Analytics app (`packages/twenty-apps/internal/youtube-analytics`). |

The 2.60 instance command `1794924648050` (adds `core."viewField"."relationPathFieldMetadataIds"`) was applied by hand and recorded in `upgradeMigration`, as described above.

## Workspace configuration done

- **LinkedIn app:**
  - Installed.
  - The owner must set `UNIPILE_API_KEY` and `UNIPILE_WEBHOOK_SECRET` in Settings → Developers → Apps → LinkedIn → Config.
  - It stores messages in the core messaging tables and does not store connections.
- **Fireflies app:**
  - Installed and configured. The webhook URL is `https://crm.fundlevel.co/s/webhook/fireflies`; the README wrongly omits `/s/`.
  - Fathom app is installed and connected twice (Nov 14 and Nov 17). Its webhooks are registered and reachable.
- **Dashboard** `c5715902-b655-4ffe-bf95-6e686dde9a0b`: the "All PostHog Q4 creators" table (view `7c75c821-493a-416a-97dd-2db822737d3d`) has a lookup column Production › influencer › contactLinks › person › lastEmail › subject (viewField `273a83bb-d121-4ad1-8d0b-1b547d62c152`). It was verified through the API but not visually in the browser.
- **YouTube Analytics app:**
  - Runs daily at 05:00 UTC on `influencerAnalyticsEntry` rows with `calculationsEnabled`.
  - Adds a "Refresh YouTube analytics" record action on influencers and analytics entries.
  - YouTube calls go through treg's own-key tools `yt-key-fundlevel-internal` and `yt-key-scheduler-zero`. The app setting `TREG_YOUTUBE_KEY_TOOLS` lists them, and the app switches tool when one runs out of quota.
  - The token is the treg agent token `youtube-analytics-twenty`, limited to those two tools, stored in the secret app variable `TREG_TOKEN`.
  - It reads and writes custom objects with raw GraphQL through `RestApiClient({ runAs: 'application' })`. App typed clients only include the app's own objects and standard objects.
  - Verified on AI Search: it matches the original worker exactly.
  - Posts per month caps at 5, because of the 60-video limit inherited from the worker.
- **Old Attio YouTube worker:** the Cloudflare cron for `fundlevel-youtube-analytics` was removed through the API. The fundlevel repo `packages/youtube-analytics/wrangler.jsonc` still declares `0 5 * * *`, so a redeploy would restart it writing to Attio.

## Call recordings (this session's data work, no code)

**Current state:**

- **Attio migration** (`externalRecordingId` `attio:<call_recording_id>`): 87 rows, 86 with video.
  - I uploaded 84 mp4s (9.3 GB) from Attio on 2026-11-19.
  - I added the missing Oct 20 call "Fundlevel Media Intro … Ella Sway" (`8b505ba9-4859-4ad3-af1e-d8a410c6c9fe`) with its transcript and video.
  - Only "Kareem <> TrulyInbox" has no video; Attio deleted it.
  - The migration manifest is in Drive (kareem@mail.fundlevel.co): "Attio recording manifest.json". The "Attio Call Recordings - 2026-10-21" folder is empty.
- **Fireflies app rows:** transcripts, no media; the app never imports audio or video.
  - The 17 duplicates created by the agent "Hermes" (`fireflies:call:<id>`) were merged into the app rows, with gaps filled (3 calendar links, 1 summary), and soft-deleted.
  - Six "missing" Fireflies calls couldn't be imported:
    - Adam Badar and Tamas (Feb 11) have no content.
    - Mitch/Apollo, Abdul Haseeb, Jonathan Perez and the Annual Client Webinar return "Transcript not found" (other hosts).
  - The owner dropped the Bec Hu and Consultation calls.
- **Fathom:** 19 rows imported earlier by Hermes (`fathom:call:`), with transcripts and summaries and no media. The owner chose not to import the 2 missing ones (Jae Park, Nov 11 Impromptu).
  - Fathom's last recording was 2025-12-19, recorded as kareem@fundlevel.co. Calendar sync now uses kareem@mail.fundlevel.co, which is the likely reason Fathom stopped auto-joining even with "Auto-record all meetings" on.
  - The owner should reconnect Fathom's calendar as kareem@mail.fundlevel.co. This is unconfirmed.
- The failed 10-second Twenty call-recorder entry for Oct 20 (`db614acd-…`) was soft-deleted.

**How video upload works** (for repeats):

1. `createFileUpload(filename, size, fileFolder: FilesField, fieldMetadataId: 3afc7720-3770-4565-9ca5-05c224f13348)` on the metadata API.
2. On claudy, run `curl -sfL <source> | curl -sf -T - -H "Content-Type: <contentType>" "http://127.0.0.1:3350/file-upload/<fileId>?token=…"`. This skips Cloudflare's 100 MB limit.
3. Call `completeFileUpload(fileId)`.
4. Run `updateCallRecording(id, { video: [{ fileId, label }] })`.

**Related gotchas:**

- GraphQL `merge*` is disabled for `callRecording`, because it's a system object.
- The API exposes the summary as `summary { markdown blocknote }`.
- Cloudflare blocks Python's default user agent on Attio video URLs (error 1010); use curl.

## Open items

1. **Credentials to revoke or rotate:**
   - The Attio API key the owner pasted in chat. It's still active and has full scopes.
   - The ghcr read token on claudy, only if no longer wanted.
2. **Fathom:** reconnect its calendar as kareem@mail.fundlevel.co, or confirm whether the two addresses are the same Google account.
3. **The worker's schedule:** remove the cron from the fundlevel repo's `wrangler.jsonc` so a redeploy can't restart the Attio worker.
4. **Browser check:** check the dashboard lookup column and the YouTube refresh button in the browser. The Chrome extension wasn't connected this session.
5. **First full YouTube Analytics run:** the first scheduled run was due 2026-11-20 05:00 UTC. Check the `calculationStatus` / `calculationError` fields. The 62 old `BLOCKED` statuses will be replaced with `READY` or `FAILED`.
6. **Fireflies app:** it doesn't import audio or video. Adding that is possible on paid Fireflies plans.
7. **Upstream PRs:** the lookup-column and OAuth fixes live only in the fork. Upstream PRs would be needed to keep them across merges.
8. **Schema audit findings, not actioned:**
   - duplicate `influencerRelatedTo` / `influencerRelatedTo5` reverse relations;
   - 14 Attio list-entry objects;
   - 65 empty `pdl*` fields;
   - legacy LinkedIn id duplicates;
   - opportunity `attioStage` versus the unused `stage`;
   - calculator-app leftovers.

## Useful commands

- **Metadata or data API as the owner:** `npx -y twenty@2.59.0 --no-input api graphql [--metadata] --query '…'`. The remote is `fundlevel`, and the token refreshes automatically.
- **Apply an app:** from the app directory, run `yarn install` (if `node_modules` is missing), then `npx -y twenty@2.59.0 app apply --no-prune` (add `--create` the first time).
- **Run an app function:** `npx -y twenty@2.59.0 app exec --path <appDir> --name <function> --payload '{…}'`. For a route-style payload, pass `{"requestContext":{},"body":{…}}`.
- **SQL on claudy:** `ssh claudy "cd /mnt/storage/twenty-crm && docker compose exec -T db psql -U postgres -d default"`.
- **Durable memory notes** in `~/.claude/projects/-Users-kareem-dev-projects-twenty/memory/`:
  - `claudy-twenty-deployment.md`
  - `no-backups-on-claudy.md`
  - `youtube-analytics-app.md`
  - `call-recordings-state.md`
