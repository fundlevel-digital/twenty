# Handoff: YouTube Analytics app (session fork "Twenty - YouTube Analytics Sync")

Written 2026-11-20. Branch `fundlevel/youtube-analytics-app`, based on `91e6edbf31` ("Add the YouTube Analytics app"). That commit is also on `main`, so `main` already holds the app.

## Continuation: 2026-11-20, Codex

Continued in Conductor workspace `memphis`, on
`fundlevel/youtube-analytics-app-v1`. The branch name was preserved.

### Rate-limit investigation and deployed fix

- Read the supplied Claude JSONL transcripts and verified the original live
  state with read-only PostgreSQL queries: 77 READY, 13 FAILED, with the same
  9 playlist and 4 video HTTP 429 errors reported below.
- Queried treg's `/calls` history filtered by this app's agent API key, following
  `before_id` pagination. The first cron generated 541 recorded attempts:
  **384 HTTP 200 and 157 HTTP 429**. All 157 failures were treg refusals tagged
  `refused_by: cap`, with no upstream duration or charge. They did not reach
  Google. This tag covers several kinds of refusal; the exact historical reason
  is not exposed by the team's retained audit response. Do not equate it with
  an exhausted YouTube key or assume a specific treg cap.
- Updated `youtube-client.ts`: four attempts with 4, 8 and 16 second backoffs;
  honor longer `Retry-After` values (seconds or HTTP date) and
  `detail.retry_after_s`; identify treg errors via `X-Treg-Error`; include
  origin, tool name, available reason and `X-Treg-Call-Id` in terminal errors.
  Known treg daily spend/trial refusals fail immediately. Only upstream Google
  quota errors exhaust a YouTube key; treg refusals do not rotate keys.
- Reduced creator concurrency from 4 to 2. Metric definitions were unchanged.
- Deployed using Twenty CLI 2.59.0, explicit remote `fundlevel`, `app apply
  --no-prune`. The plan updated one logic-function checksum and deleted nothing.
  Deployed content hash:
  `7b922b375933271ad4a337de1793d90caf9bdebb8797903efd34e91ebd8db7fe`.
- Retried only the 13 failed entries through `app exec`. Run:
  **2026-11-20 16:55:12–16:55:35 UTC**, 23.6 seconds; 13 selected,
  13 written, 0 failed; 81 requests (1 channel, 40 playlist, 40 video),
  no exhausted key tools. treg recorded 81 HTTP 200 responses. Own keys cost $0.
- Verified PostgreSQL afterward: **90 READY, 0 FAILED, no calculation errors**.
  The other 77 entries retain their original successful morning refresh.

### Verification and remaining limits

- **45 tests pass in 8 files**, each file run sequentially with the app's own
  installed dependencies; oxlint reports no warnings or errors.
- App typecheck passed directly with resource limits:
  `GOMEMLIMIT=512MiB GOMAXPROCS=2 GOGC=25 ./node_modules/.bin/tsgo --noEmit
  -p tsconfig.spec.json --composite false --incremental false`.
- The next scheduled run, **2026-11-21 05:00 UTC**, still needs verification.
  The daytime retry establishes recovery, not a reproduction of the original
  overnight treg contention. Inspect new error reasons and call IDs if it fails.
- Browser verification remains open: Playwright could not start because its
  configured Google Chrome binary is absent. No browser was installed.
- Hindsight recall/retention was unavailable on this Mac because its private
  `twenty` profile is missing. This handoff records the verified continuation.
- Private operation outputs are gitignored under `.context/` in `memphis`:
  `youtube-treg-call-audit.json`, `youtube-app-apply.json`, and
  `youtube-retry-result.json`. These contain operational evidence and must not
  be added to Git or engineering memory as raw records.

## What this fork is about

Fundlevel moved its influencer CRM from Attio to a self-hosted Twenty fork (`https://crm.fundlevel.co`). In Attio, a Cloudflare Worker refreshed each creator's YouTube analytics every day. After the migration nothing refreshed them in Twenty, and the analytics entries there were only ever edited by hand.

This fork brings that back as a Twenty app, adds a button to refresh a creator on demand, and sends YouTube calls through treg so several API keys can share the quota.

The decisions, all made by the owner:
- Build it as a Twenty app rather than a Twenty workflow.
- Use treg for the YouTube API keys.
- Call the app "YouTube Analytics".
- Stop the Attio worker.

## What exists now

### The app (this folder)

- Standalone yarn project with its own `yarn.lock` and `node_modules` (gitignored), with twenty-sdk and twenty-client-sdk pinned to 2.59.0.
- Deploy from this folder with `npx -y twenty@2.59.0 --no-input app apply --no-prune`. The saved CLI remote is `fundlevel`, at `https://crm-login.fundlevel.co`.
- It is installed in workspace `crm` (id `3b424be9-f8da-41b6-b564-16c9da2df4e1`, schema `workspace_3iaq1z1s1jv5ol6qhlcwulwbl`):
  - application id `cb7f8a34-0b8f-44c8-b07d-db9bc706e836`
  - universal id `a26ff03a-f6c4-4636-8c59-221b4cdba815`
- One logic function, `refresh-youtube-analytics` (`src/logic-functions/refresh-youtube-analytics.ts`), with a 900 s timeout and two triggers:
  - **Cron** `0 5 * * *` UTC: every `influencerAnalyticsEntry` with `calculationsEnabled = true` (90 entries).
  - **HTTP route** `POST /s/youtube-analytics/refresh`, auth required, with body `{ entryIds?: string[], influencerIds?: string[] }`.
- Two command menu items labelled "Refresh YouTube analytics" (RECORD_SELECTION, hidden on select-all):
  - on **influencerAnalyticsEntry**: `src/command-menu-items/refresh-analytics-entries.ts`
  - on **influencer**: `refresh-influencers.ts`, which refreshes all of that influencer's entries
  - Each uses a headless front component in `src/front-components/` that calls the route and shows a snackbar.
- The role (`src/roles/default-function.role.ts`) reads influencer and reads and updates influencerAnalyticsEntry, declared with `recordsPermissions`.
- App settings:
  - `TREG_TOKEN` (secret) holds the treg agent token `youtube-analytics-twenty`. It is already set.
  - `TREG_YOUTUBE_KEY_TOOLS` defaults to `yt-key-fundlevel-internal,yt-key-scheduler-zero`.

### How a run works

1. List the entries with raw GraphQL, 200 per page, together with the parent influencer's `youtubeId`, `youtubeHandle` and `youtubeUrl`.
2. Resolve channels with `channels.list`, in batches.
3. Page through the uploads playlist until 60 qualifying videos are found, skipping videos of 181 s or less and live or upcoming ones.
4. Load video stats in batches of 50.
5. Compute the metrics: trailing 12 videos, a 60-day window, and posts per month = qualifying videos in the last 365 days ÷ 12.
6. Write each entry.
   - On success: the metrics, `lastPostDate`, `averageStatisticsUpdatedAt`, `lastCalculatedAt`, `calculationStatus = READY` and an empty `calculationError`.
   - On failure: `calculationStatus = FAILED` and `calculationError` set to the reason. Metrics and `lastCalculatedAt` are left alone.
   - It never writes CPM, `live*` (computed fields that recalculate themselves) or `source*`.
   - It fills `name` only when it is blank.

### YouTube through treg

- Calls go to `https://treg.to/call/<tool>/youtube/v3/<endpoint>?…` with the `X-Treg-Token` header and no `key` parameter; treg injects the key.
- The two tools are the team's own treg tools, each holding a Google API key from a different project, so calls are free. Each key has 10,000 units a day, and one creator costs about 5.
- On 403 `quotaExceeded`, `dailyLimitExceeded` or `rateLimitExceeded`, the app marks that tool exhausted for the rest of the run and moves to the next. When every tool is exhausted, the remaining entries fail.
- Transient failures get at most 4 attempts on the same tool, with 4/8/16-second backoff and longer server retry timing honored. They do **not** rotate to the next tool. Terminal errors identify treg versus upstream and include the call ID when available.
- treg token `youtube-analytics-twenty`: viewer role, limited to those two tools, local runs off. treg shows a token only once.
  - To rotate it, run `treg org agent-new youtube-analytics-twenty --role viewer --tools yt-key-fundlevel-internal,yt-key-scheduler-zero --local-run off`.
  - Then set the new value with the metadata mutation `updateOneApplicationVariable(key: "TREG_TOKEN", value: …, applicationId: "cb7f8a34-0b8f-44c8-b07d-db9bc706e836")`, via `npx -y twenty@2.59.0 api graphql --metadata`.
- To add a key: register it in treg as an own tool, then add its name to `TREG_YOUTUBE_KEY_TOOLS`.

### Why it uses raw GraphQL

- The typed `CoreApiClient` the server generates for an app only contains the standard objects, the app's own objects, and the targets of the app's own relation fields. `influencer` and `influencerAnalyticsEntry` belong to the workspace's Custom app, so `client.query({ influencerAnalyticsEntries })` fails on the client with "type Query does not have a field".
- The server doesn't apply that scope to execution (only to introspection), so `src/logic-functions/utils/workspace-graphql-client.util.ts` posts raw GraphQL to `/graphql` with `RestApiClient({ runAs: 'application' })`. Permissions come from the app role.
- Don't switch back to the typed client.

### The old Attio worker (stopped)

- Cloudflare Worker `fundlevel-youtube-analytics`, from repo `~/dev/projects/fundlevel/packages/youtube-analytics`. It refreshed Attio's `influencer_analytics` list daily.
- On 2026-11-19 its schedule was removed through the Cloudflare API (`PUT /accounts/f435fee464dc0d27f022f859ea1adb9c/workers/scripts/fundlevel-youtube-analytics/schedules` with `[]`), using the wrangler OAuth token. The code is still deployed.
- **Its `wrangler.jsonc` still declares `"crons": ["0 5 * * *"]`**, so redeploying it would restart writes to Attio. That repo is untouched.
- This app is a port of that worker. `youtube.ts` and `metrics.ts` behave the same; `attio.ts` was replaced with Twenty reads and writes. Dropped: the 4-per-invocation chunking (free Workers plan), the CLI and its dry-run and historical `validate` modes, and the token check on the manual endpoint.

## Verification so far

- 33 unit tests pass across 8 files, run one file at a time with vitest. oxlint is clean, and a capped tsgo run over the app's files passes.
- 2026-11-19 manual run on AI Search (entry `31775128-cd91-5e0e-8f74-6a7ae3c2a8af`):
  - It succeeded in 2.5 s using 5 quota units, and wrote 447,483 average and 415,035 median views, 479,855 60-day average, 5 posts a month, 57.74% view rate and 1.78% engagement.
  - Running the **original worker code** (with the Infisical `/packages/jobs` YouTube key) on the same channel gave the same numbers; the 60-day average was 479,856, a rounding difference.
- 2026-11-20 first cron run at 05:00:16 UTC: **77 READY, 13 FAILED**.
  - All 13 failures are HTTP 429: 9 × "YouTube playlistItemsList failed with status 429" and 4 × "YouTube videosList failed with status 429".
  - Those 13 entries keep their old metrics and `lastCalculatedAt` from 2026-11-03.

## Where we left off (open items, most important first)

1. **Verify the next scheduled run.** The 429 handling fix is deployed and the
   13 failed entries recovered; all 90 are now READY. See the continuation above.
   Check the 2026-11-21 05:00 UTC cron. If treg refuses calls again, use the saved
   reason and call ID to identify its policy or capacity limit before changing
   YouTube key settings.

2. **Posts per month can't exceed 5** because collection stops at 60 videos (60 ÷ 12), the same as the old worker. Raising `maxUploads` costs about 2 more units per extra 50-video page for heavy posters. The owner hasn't decided.
3. **Hand-set values were overwritten.** Before this app, AI Search had been set by hand on 2026-11-18 to 563,584 average views and 9.92 posts a month, and 62 entries were `BLOCKED` / `MISSING_ANALYTICS_INPUT`. Nobody found what wrote those. The owner was told; check with them if another process turns out to own `calculationStatus`.
4. Optional, not done:
   - Write the live subscriber count back to `influencer.youtubeSubscriberCount`; it's already fetched by `channels.list`.
   - Remove the cron from the old worker's `wrangler.jsonc` in the fundlevel repo.
5. Not done: open the refresh button in the browser. The Chrome extension wasn't connected during this session; the route was tested only through `app exec`.

## Useful facts

- Workspace data, read-only: `ssh claudy "cd /mnt/storage/twenty-crm && docker compose exec -T db psql -U postgres -d default"`. Custom object tables have a `_` prefix, e.g. `workspace_3iaq1z1s1jv5ol6qhlcwulwbl."_influencerAnalyticsEntry"`. **Never take backups or pg_dumps on claudy.**
- The app doesn't need a server image; `app apply` is enough. Server deploys are covered in the claudy notes in the owner's memory (`claudy-twenty-deployment`).
- The owner's Mac has 16 GB, so don't run full typechecks, nx, or Docker locally. Use single-file `npx vitest run <file>` from this folder, and `npx oxfmt <files>`.
- No AI attribution in commits.
- Related work earlier in the same session, already on `main` and deployed: multi-level lookup columns (`edbcbeac32`, `0c66619c07`), the OAuth callback host fix (`f211664c4d`), LinkedIn app proxy and paging (`e8d33cb03d`), and Boat CI (`f3955b2930`).
