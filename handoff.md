# Handoff: Slack Sync (as of 2026-11-20)

Status: **planned, nothing built yet.** This branch (`fundlevel/slack-sync`, from `main` at `91e6edbf31`) is for the Slack Sync work only.

## Goal

Show Slack messages with clients on People and Company records in the Fundlevel Twenty fork, with threads, reactions, edits, deletes and per-channel include/exclude.

- **Slack apps**: the owner's own internal Slack apps, Fundlevel Ops for the `crm` Twenty workspace and Sunny Ops for the `sunny` workspace.
- **Connections**: each teammate connects with a Slack **user token**, the same way the LinkedIn app connects each member, so every conversation that user is in can sync.

The existing `packages/twenty-apps/public/slack` is the upstream "@Twenty" assistant bot (answers questions, posts messages, link previews). It doesn't store Slack history. Build a **separate app** (working name "Slack Sync", suggested path `packages/twenty-apps/internal/slack-sync`) so upstream merges stay clean.

## Agreed decisions

1. **One copy per message, however many people connect.** Today Twenty only de-duplicates app messages within one connection, so a channel five teammates are in would be stored five times. Make it work like email, where one message is stored once and linked to each inbox. Fork change in `packages/twenty-server/src/engine/metadata-modules/message-channel/`:
   - `utils/build-app-message-header-message-id.util.ts` returns `app:${applicationId}:${messageChannelId}:${externalId}`. For opted-in providers, drop `messageChannelId`. Add an opt-in flag on the messaging provider manifest (`MessagingProviderManifest` in `packages/twenty-shared/src/application/`) so LinkedIn is unaffected.
   - `packages/twenty-server/src/modules/messaging/message-import-manager/services/messaging-message.service.ts` already looks up existing messages by `headerMessageId` across the workspace, and adds a `messageChannelMessageAssociation` for a new channel. The email path depends on this.
   - In `services/application-message-ingestion.service.ts`, the lock (`buildAppIngestionLockKey`) is per message channel because "dedup never spans channels". Widen it to workspace and application for opted-in providers, since `headerMessageId` has no unique index.
   - Slack ids: `externalId` = `${teamId}:${channelId}:${ts}`, `threadExternalId` = `${teamId}:${channelId}:${thread_ts ?? ts}`.
2. **No company mapping.** The owner doesn't want internal-only channels such as an internal #posthog. Slack Connect messages land on client People through participant `personId`, matched by Slack user email. Company pages already roll up their people's threads.
3. **Reactions**: add fields to the message object, for example `slackReactions` (JSON: emoji, count, user ids), `slackPermalink`, `slackEditedAt`, `slackDeletedAt`.
4. **Edits and deletes**:
   - Edits update the stored text.
   - Deletes are soft: set `slackDeletedAt`.
   - A message deleted by an internal sender (a workspace member) is hidden from everyone except that sender.
   - A message deleted by an external sender stays visible, marked "deleted".
   - This needs an update path in the ingest, since re-ingesting an existing `externalId` is currently a no-op, plus a front-end display change in the message thread view.
5. **Slack credentials per Twenty workspace.** Slack client id, client secret and signing secret are **application variables**, not server variables (which are server-wide on the app registration). That lets Fundlevel and Sunny each use their own Slack app on the same server.
6. **Sharing**: the standard per-connection visibility used by email and LinkedIn (metadata only, subject, or everything). DMs are covered by the same setting.
7. **Rate limits**: keep both Slack apps internal, installed only in their own workspace. Slack throttles `conversations.history` and `conversations.replies` hard for distributed non-Marketplace apps; internal apps keep normal limits.
8. **Include/exclude**: Slack channels and DMs become **message folders** on each user's message channel (SDK `syncAppMessageFolders`). Users toggle which conversations sync in the existing folder settings screen. No custom object or custom UI.
9. **Live sync and backfill**:
   - The Events API with user-scope event subscriptions: `message.channels`, `message.groups`, `message.im`, `message.mpim` (including `message_changed` and `message_deleted` subtypes), `reaction_added` and `reaction_removed`.
   - Slack delivers each event once per app, with an `authorizations` list, so route it to the matching connections.
   - Backfill a conversation when it's turned on (`conversations.history` plus `conversations.replies`).
   - Ingest takes at most 100 messages per call, so page it.

## Slack app setup (per workspace)

- User token scopes: `channels:history`, `groups:history`, `im:history`, `mpim:history`, `channels:read`, `groups:read`, `im:read`, `mpim:read`, `reactions:read`, `users:read`, `users:read.email`.
- OAuth redirect: the Twenty connection-provider callback on `https://crm-login.fundlevel.co`. The fork already forwards the callback to the workspace host when the flow cookie is missing (commit `f211664c4d`).
- Event subscription request URL: an app HTTP route with `isAuthRequired: false` that verifies the Slack signing secret. App routes are served under `/s/`, for example `https://crm.fundlevel.co/s/webhook/slack-sync`.

## SDK pieces to reuse

- `defineConnectionProvider`, `defineMessagingProvider` (`packages/twenty-sdk/src/sdk/define/`).
- `ingestMessages` (`packages/twenty-sdk/src/sdk/logic-function/messaging/ingest-messages.ts`). The `IngestMessage` type covers `externalId`, `threadExternalId`, `text`, `receivedAt`, participants (exactly one `FROM`, with optional `personId` and `workspaceMemberId`), `folderExternalIds` and attachments.
- Template: `packages/twenty-apps/public/linkedin`. It has per-user connections, a messaging provider, message channels, webhook ingest and backfill. It stores LinkedIn messages in the core messaging tables (APP channel, METADATA visibility).
- An app's typed `CoreApiClient` only includes standard objects, the app's own objects, and targets of the app's own relation fields. For anything else, send raw GraphQL with `RestApiClient({ runAs: 'application' })`, as `packages/twenty-apps/internal/youtube-analytics` does.

## Build order

1. **Fork core changes** (shipped in a new server image):
   - cross-connection de-duplication for opted-in messaging providers;
   - an update path for ingested messages (text edits and the soft-delete field);
   - unit tests for both.
2. **The Slack Sync app**: connection provider, messaging provider, folder sync for conversations, events webhook, backfill, People matching by email, reaction and edit/delete handling. Deploy with `npx -y twenty@2.59.0 --no-input app apply --create --no-prune` from the app's directory (CLI remote `fundlevel`), then set the per-workspace Slack credentials.
3. **Front-end display** of deleted messages, following the rules in decision 4.

## Rules and environment

- The owner prefers having an Opus worker implement while the main session orchestrates and reviews before anything ships.
- No AI attribution in commits or PRs. Don't do unrequested work.
- The owner's Mac has 16 GB and crashed once. Never run full typechecks, `nx`, whole-package lint, Docker builds, or parallel heavy jobs on it.
  - Tests: single-file jest or vitest with `--runInBand`.
  - Typechecks: a temporary tsconfig listing only changed files, run with `GOMAXPROCS=1 GOMEMLIMIT=3GiB nice -n 15 tsgo -p <tmp tsconfig> --noEmit --singleThreaded`, with a watchdog that kills it above 5 GB. Ignore spurious errors from missing `@types` and jest-dom.
- **Images**: pushing to `org main` (`fundlevel-digital/twenty`) builds `ghcr.io/fundlevel-digital/twenty:<sha>` on Boat in about 17 minutes. To deploy on `ssh claudy` (`/mnt/storage/twenty-crm`): pull the image, set it on lines 4 and 65 of `docker-compose.yml`, then run `docker compose up -d server worker`. Never take backups on claudy.
- **Upgrade commands**: if the core change needs one, a fork-added instance command in an already-upgraded version is silently skipped by the upgrade cursor. Apply it by hand and record `core."upgradeMigration"` rows back-dated, as described in memory note `claudy-twenty-deployment.md`.
- **Workspaces**: crm `3b424be9-f8da-41b6-b564-16c9da2df4e1`, sunny `d3ce8b66-a75f-411e-a7bf-2bd7295eb76e`.

## Open questions for the owner

- How far back to backfill when a conversation is turned on.
- Default folder state for new conversations: Slack Connect channels on and everything else off, or everything off until the user picks.
