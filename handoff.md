# Handoff: Fundlevel Twenty fork (as of 2026-11-19)

No background processes are running. All code from this session is committed and pushed.

## Where things are

- **Code**: commit `91e6edbf31` on `main`, `fundlevel/dashboard-lookups-youtube-analytics` and `fundlevel-dashboard`, on both remotes:
  - `org` is `fundlevel-digital/twenty`. Pushing to its `main` triggers the Boat image build.
  - `origin` is `kareem717/twenty`.

  This file lives only on branch `fundlevel/handoff-2026-11-19`.
- **Production**: `ssh claudy`, deploy dir `/mnt/storage/twenty-crm`, compose project `fundlevel-twenty-trial`.
  - Running image: `ghcr.io/fundlevel-digital/twenty:0c66619c07687adf3195745ee16ca1540ba0e953`, on lines 4 and 65 of `docker-compose.yml`.
  - Commit `91e6edbf31` only adds the YouTube app folder, so the running image does not need rebuilding.
- **Workspaces on the server**: crm (Fundlevel, `3b424be9-f8da-41b6-b564-16c9da2df4e1`, schema `workspace_3iaq1z1s1jv5ol6qhlcwulwbl`), sunny (`d3ce8b66-a75f-411e-a7bf-2bd7295eb76e`) and schedulerzero (`2fd0f2e0-1993-47e7-abfc-73a3a3e09a1e`).
- **URLs**: users browse `https://crm.fundlevel.co`. `SERVER_URL` is `https://crm-login.fundlevel.co`.
- **Memory notes**: `~/.claude/projects/-Users-kareem-dev-projects-twenty/memory/`. The relevant ones are `claudy-twenty-deployment.md`, `youtube-analytics-app.md` and `no-backups-on-claudy.md`.

## Standing rules from the owner

- Never take pg_dumps or backups on claudy, including before deploys.
- No AI attribution in commits or PRs.
- Don't do unrequested work.
- Never run full typechecks, `nx`, lint over a whole package, Docker builds, or parallel heavy jobs on the 16 GB Mac. It crashed once.
  - Use single-file jest/vitest with `--runInBand`.
  - For typechecks, use a trimmed tsconfig listing only the changed files, run with capped tsgo: `GOMAXPROCS=1 GOMEMLIMIT=3GiB nice -n 15 tsgo -p <tmp tsconfig> --noEmit --singleThreaded`, with a watchdog that kills it above 5 GB.
  - The trimmed check reports spurious errors from missing `@types` and jest-dom (for example `graphql-errors.util.ts(254)`). Ignore those.
- The owner prefers having an Opus worker implement while the main session orchestrates and reviews.

## Build and deploy

1. Push to `org main`. The Boat workflow `.github/workflows/fundlevel-build.yaml` (`runs-on: boat`, about 17 minutes) publishes the private images `ghcr.io/fundlevel-digital/twenty:<sha>` and `:main`.
2. claudy is already `docker login`ed to ghcr as kareem717 with a read:packages token.
3. On claudy:
   - `docker pull ghcr.io/fundlevel-digital/twenty:<sha>`
   - change the image tag on lines 4 and 65 of `docker-compose.yml` (sed works)
   - `docker compose up -d server worker`. The entrypoint runs the upgrade.
4. Check health with `curl https://crm.fundlevel.co/healthz`.
5. **Upgrade cursor gotcha.** Within a version, instance commands sort before workspace commands. A fork-added instance command in a version whose workspace command already ran is silently skipped. This happened with 2.59 `1794606690417` and 2.60 `1794924648050`. To fix:
   - apply the SQL by hand;
   - insert `core."upgradeMigration"` rows: one with a null `workspaceId` plus one per workspace, status `completed`;
   - back-date `createdAt` so it sorts before newer rows;
   - restart the server and worker.

   Until that's done, the server hides the new column. Its logs show "hidden columns on …".
6. All 58 upstream workflows on `fundlevel-digital/twenty` are disabled; only `fundlevel-build.yaml` runs. New upstream workflow files arrive enabled after a merge, so disable them again with `gh api -X PUT repos/fundlevel-digital/twenty/actions/workflows/<id>/disable`.
7. App deploys are separate from the image: `npx -y twenty@2.59.0 --no-input app apply --no-prune` from the app's directory. Add `--create` the first time. The CLI remote is `fundlevel` and its token refreshes itself.
8. Raw metadata and core API calls work with `npx -y twenty@2.59.0 --no-input api graphql [--metadata] --query @file --variables @file`.
9. To set an app variable, call metadata mutation `updateOneApplicationVariable(key, value, applicationId)`.
10. To query the database (the postgres MCP server was down): `ssh claudy "cd /mnt/storage/twenty-crm && docker compose exec -T db psql -U postgres -d default"`. Workspace tables are prefixed `_` for custom objects, for example `"_influencer"`.

## Done this session (all deployed)

1. **LinkedIn app** (`packages/twenty-apps/public/linkedin`):
   - Sign-in links set `allow_user_proxy_override` and `allow_user_country_override`, so members pick a proxy at sign-in.
   - Chat list requests are capped at 25, fixing the Unipile 400 error.
   - Applied with `twenty app apply`.
   - The owner still sets `UNIPILE_API_KEY` and `UNIPILE_WEBHOOK_SECRET` under Settings → Developers → Apps → LinkedIn → Config.
   - It stores messages in core messaging tables (APP channel, METADATA visibility). It does not store connections.
2. **Fireflies app**: installed. Webhook URL is `https://crm.fundlevel.co/s/webhook/fireflies`; the README wrongly omits `/s/`.
3. **OAuth sign-in fix** (commit `f211664c4d`): when the flow cookie is missing (crm vs crm-login host), the callback is forwarded to the workspace host. This fixed "OAuth sign-in must finish in the browser that started it", and Fathom is connected. It's in the image, so the hot patch is no longer needed.
4. **Multi-level lookup columns** (commit `edbcbeac32`):
   - New `viewField.relationPathFieldMetadataIds` jsonb column.
   - At most 5 hops and at most one one-to-many hop. `CONNECTION_MAX_DEPTH` is now 6.
   - Allowed in TABLE_WIDGET views, and the AI view-field tools accept the path.
   - Follow-up fix `0c66619c07`: validation now loads the apps that own each path hop. Before, a hop field owned by another app, such as `person.lastEmail` from the Last contact app, was rejected.
   - Added to the "All PostHog Q4 creators" dashboard table (view `7c75c821-493a-416a-97dd-2db822737d3d`, dashboard `c5715902-b655-4ffe-bf95-6e686dde9a0b`) as view field `273a83bb-d121-4ad1-8d0b-1b547d62c152`: Production › influencer › contactLinks › person › lastEmail › subject.
   - Only about 1,000 of 18,700 people have `lastEmailId`, so the column is often blank.
5. **Boat CI**: the workflow above.
6. **YouTube Analytics app** (`packages/twenty-apps/internal/youtube-analytics`, commit `91e6edbf31`, app id `cb7f8a34-0b8f-44c8-b07d-db9bc706e836`):
   - **Schedule and button**: a daily cron at 05:00 UTC refreshes entries with `calculationsEnabled`. The "Refresh YouTube analytics" record action on influencers and analytics entries does the same on demand.
   - **YouTube access**: calls go through treg own tools `yt-key-fundlevel-internal` and `yt-key-scheduler-zero`. App setting `TREG_YOUTUBE_KEY_TOOLS` lists them, and the app switches keys on quota errors.
   - **treg token**: agent `youtube-analytics-twenty` (viewer, limited to those two tools), stored in app secret `TREG_TOKEN`. It's shown only once; rotate by running `treg org agent-new youtube-analytics-twenty --role viewer --tools yt-key-fundlevel-internal,yt-key-scheduler-zero --local-run off` and storing the new token.
   - **Data access**: reads and writes custom objects with raw GraphQL via `RestApiClient({ runAs: 'application' })`. An app's typed `CoreApiClient` only includes standard objects, the app's own objects, and targets of the app's own relation fields.
   - **Verified**: the numbers for AI Search match the original worker's code exactly.
   - **Known limit**: posts per month is capped at 5 because at most 60 videos are collected. This is inherited from the worker.
   - **Statuses**: overwrites old `BLOCKED` / `MISSING_ANALYTICS_INPUT` with `READY` or `FAILED`.
   - **Hand-set values**: someone set AI Search's values by hand on 2026-11-18 (563,584 average views, 9.92 posts a month). The daily run overwrites them.
7. **Old Attio Cloudflare worker** `fundlevel-youtube-analytics` (fundlevel repo `packages/youtube-analytics`, Cloudflare account `f435fee464dc0d27f022f859ea1adb9c`): its cron schedule was removed through the Cloudflare API, using the wrangler OAuth token from `~/.wrangler/config/default.toml`. Its `wrangler.jsonc` still declares `0 5 * * *`, so redeploying it would restart it writing to Attio. Not changed yet; the owner was asked.
8. **Schema audit**: report delivered earlier. Findings were influencerRelatedTo/RelatedTo5 duplicate reverse relations, 14 Attio list-entry objects, 65 empty pdl* fields, legacy LinkedIn id duplicates, opportunity `attioStage` vs unused `stage`, and calculator-app leftovers. No changes made.

## Open, not started: Slack sync (plan agreed, awaiting the owner's "go")

The owner wants Slack messages from client channels (Slack Connect, for example #PostHog) on People and Company records. They will use their own internal Slack apps: Fundlevel Ops for the crm workspace and Sunny Ops for sunny. Each teammate connects with a user token, like the LinkedIn app.

The existing `packages/twenty-apps/public/slack` is the upstream "@Twenty" assistant bot. It doesn't sync history. Build a separate app ("Slack Sync") so upstream merges stay clean.

Agreed decisions:
1. **Duplicates**: make app messages de-duplicate across connections, like email. Fork change in `packages/twenty-server/src/engine/metadata-modules/message-channel/`:
   - `utils/build-app-message-header-message-id.util.ts` returns `app:${applicationId}:${messageChannelId}:${externalId}`. Drop `messageChannelId` for opted-in providers, using a flag on the messaging provider manifest so LinkedIn is unaffected.
   - `messaging-message.service.ts` already matches existing messages by `headerMessageId` across the workspace and adds a `messageChannelMessageAssociation`.
   - Widen the ingest lock in `services/application-message-ingestion.service.ts` (`buildAppIngestionLockKey`). It's currently per channel; make it per workspace and application.
   - Slack `externalId` would be `${teamId}:${channelId}:${ts}`. `threadExternalId` is `${teamId}:${channelId}:${thread_ts ?? ts}`.
2. **No company mapping.** Internal-only channels are not wanted. Slack Connect messages land on client People through participant `personId`, matched by Slack user email, and company pages roll up their people's threads.
3. **Reactions**: fields on the message object, for example `slackReactions` (JSON: emoji, count, users), Slack permalink, `slackEditedAt`, `slackDeletedAt`.
4. **Deletes**: soft delete. A message deleted by an internal sender is hidden from everyone but the sender; one deleted by an external sender stays visible, marked "deleted". This needs an update path in the ingest, since re-ingesting is currently a no-op, plus a front-end display change. Edits update the text.
5. **Credentials**: Slack client id and secret are per-workspace application variables, not server variables, so each Twenty workspace uses its own Slack app.
6. **Sharing**: the standard per-connection visibility (metadata, subject or everything), as with email and LinkedIn. DMs are included, under the same control.
7. **Rate limits**: internal apps only, which keeps Slack's normal `conversations.history` limits. Distributed non-Marketplace apps are throttled hard.
8. **Include/exclude**: Slack channels and DMs become message folders (SDK `syncAppMessageFolders`), so each user toggles them in the existing folder settings.
9. **Live sync**: the Events API with user-scope subscriptions (message.channels/groups/im/mpim, reaction_added/removed, message_changed/message_deleted). Backfill a channel when it's enabled. Ingest takes at most 100 messages per call.

User token scopes needed: channels:history, groups:history, im:history, mpim:history, channels:read, groups:read, im:read, mpim:read, reactions:read, users:read, users:read.email.

SDK pieces to reuse: `defineMessagingProvider`, `defineConnectionProvider`, and `ingestMessages` (`packages/twenty-sdk/src/sdk/logic-function/messaging/`). Use the LinkedIn app as the template for per-user connections, messaging channels and webhooks.

Proposed build order:
1. Fork core changes: cross-channel de-duplication (opt-in), and the edit/delete update path. This ships in a new server image.
2. The `Slack Sync` app, deployed with `twenty app apply`.
3. The deleted-message display change in the front end.
