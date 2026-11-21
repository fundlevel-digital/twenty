# Handoff: Slack Sync (updated 2026-11-21)

Status: **MVP implemented; VM demo preview running; not deployed to production or verified against live Slack.** The current branch is `fundlevel/slack-sync-app`. The original plan below was saved on `fundlevel/slack-sync`, from `main` at `91e6edbf31`.

## MVP implementation

- App: `packages/twenty-apps/internal/slack-sync`; see its README for setup, behavior, verification commands and limits.
- Core: opt-in shared message identities and ingestion locks; authenticated update-only ingestion; generic `providerMetadata` for reactions, links, edits and soft deletion.
- Display: reactions, Slack links and edited/deleted markers. Internal deleted content is restricted through API queries, attachments and subscription snapshots/diffs, with hidden rows omitted by the frontend.
- Upgrades: a generated 2.60 instance command adds the provider opt-in; a workspace command adds message metadata. The instance command's upgrade and rollback were checked against sandbox PostgreSQL. No production upgrade has run.
- Live OAuth, Slack events and deployment still require the internal app credentials. File bodies, rich Slack formatting and import-progress UI are outside this MVP.
- Validation: 168 targeted tests passed (103 server, 35 app, 22 frontend, 8 SDK); changed-file lint is clean. The real Twenty CLI compiled the app and settings screen. App, frontend and SDK scoped typechecks pass; the expanded server check has no changed-file errors but reports eight diagnostics in untouched source/dependency builds (`semver` declarations, `twenty-emails`, and exception `status` typing).
- VM preview: `https://fundlevel-w899.conductor.show/`, using an isolated seeded Apple workspace. The app was installed through the CLI and populated with synthetic channels and messages; its preview connection has no Slack token. Local settings and message queries were verified. Ephemeral service/restart details are in `.context/slack-preview.md`.
- Preview processes now run under a detached VM supervisor with automatic restarts, replacing agent-owned backend sessions that stopped after handoff. Restart recovery was verified. The owner's attached Slack image is the application and connection-provider logo and is applied to the local preview.
- Preview hardening fixed deleted text leaking through thread snippets and added immediate snippet invalidation on message changes. Eleven additional focused tests pass. Real local API checks confirm non-senders see three sample messages and the original sender sees their own deleted fourth message.

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

## Sync defaults (owner decisions, 2026-11-21)

- Backfill the last 30 days by default, with an option to import the conversation's entire available history.
- Enable Slack Connect channels by default: these are the primary conversations to sync. Other conversations remain opt-in through the existing folder settings.

## Local MVP implementation status (2026-11-21)

Implemented on `fundlevel/slack-sync-app`, uncommitted and applied only to the VM demo. No production deployment or live Slack connection has been performed.

- The app lives in `packages/twenty-apps/internal/slack-sync`. It includes per-user OAuth, signature-verified queued events, paginated backfills, app-scoped cross-connection message/thread deduplication, edits, deletions, reactions, and the supplied application image.
- The Slack sidebar folder has Channels, Threads, and Slack Messages views. One app-owned `slackChannel` object links to native Message and MessageThread records. App-owned fields store canonical Slack IDs, channel relations, parent/replies relations, and attachment status. An out-of-order reply repair runs after ingestion.
- Native files are downloaded with the user's Slack token (`files:read`) and uploaded through the SDK attachment API. The function role needs `SystemPermissionFlag.UPLOAD_FILE`. Limits are 20 MiB/file and 40 MiB/message. Inaccessible files and changed immutable attachment batches expose a status diagnostic. Temporary unlinked uploads can remain after concurrent first imports; native attachment batches are deduplicated.
- Optional messaging-provider `channelObject` declarations and message-folder `applicationRecordId` bindings enforce channel-row visibility before counts, pagination, and nested relation loading. The owning background app can discover/upsert channels; members require connection ownership or subject/full sharing. Excluded folders remain visible to their owner.
- App ingestion accepts validated `applicationFields` for the current app's TEXT and MANY_TO_ONE native Message/Thread extensions. This grants no general permission to edit native bodies. Native message/thread SQL hides internal deletions before pagination/counts; subscription filtering runs as the subscriber and sends only a minimal invalidation when content becomes hidden.
- The new instance command `2-60-instance-command-fast-1795270892361-add-app-conversation-bindings.ts` was generated from the actual entity schema diff, verified up/down against isolated PostgreSQL, and applied through `run-instance-commands` in the demo. Run the normal generated upgrade commands on other instances; do not copy demo SQL.
- Use this fork's CLI for applying the expanded app. The CLI now recognizes `channelObject` as a reference; published 2.59.0 falsely treats its UUID as a duplicate. The app itself still builds against published SDK 2.59.0 through typed extensions.

Verification: 54 app tests passed before the final upload-permission regression assertion; the final 5 schema tests and app typecheck pass. Server feature tests, privacy SQL tests, SSE tests, frontend's 36 focused tests, SDK provider's 9 tests, CLI manifest's 68 tests, generated metadata snapshot, and the migration rollback check pass. Scoped frontend/SDK typechecks pass. Scoped server typecheck has only eight pre-existing dependency/type errors outside changed files (semver declarations, unbuilt twenty-emails declarations, and GraphQL error status typing).

The local preview is `https://fundlevel-w899.conductor.show/` (port 4173). It is a full Twenty dev workspace with synthetic Slack records; Conductor authentication protects the public URL. Supervisor configuration and synthetic verification scripts/evidence are gitignored under `.context/`. Backend, worker, and Vite must remain supervised. Keep heavy checks serial on this 8 GB VM; concurrent checks previously triggered the Conductor memory watchdog. Hindsight remote memory remains unavailable because the private profile is absent.

Actual demo verification includes native text/PNG file upload, signed download, retry without duplicates, hidden deleted-internal attachment details, live owner/Metadata/Subject channel access counts, sidebar navigation, linked native views, and read-only thread file display. Screenshots: `.context/slack-channels-sidebar.png`, `.context/slack-native-messages.png`, `.context/slack-native-threads.png`, `.context/slack-thread-attachments.png`.

Final checks: all changed-file lint checks pass (including type-aware server lint); the final ingestion service suite passes 8 tests. Backend and frontend health checks return HTTP 200 and all three supervised preview services are running.

### Owner follow-up (2026-11-21)

Conversation Type is now SELECT with CHANNEL (Channel), DM (Direct message), and GROUP_DM (Group direct message). Twenty disallows an in-place field type change, so the synthetic demo field was recreated through staged app manifests and both channel values were restored from a gitignored backup. The source definition retains its stable field UUID. This app schema has not been deployed to production.

The owner spotted a generic Reply action opening the email composer on a Slack chat. Slack Sync has no sendMessageLogicFunction and remains read-only. Email reply availability now checks the native thread channel: chat-style providers hide the email engine action across command menus, and the headless command independently checks the same condition. Native email and explicitly email-style providers retain email reply. Four focused tests, scoped frontend typecheck/lint, the app schema checks, and actual browser verification pass. Screenshots: `.context/slack-conversation-select.png`, `.context/slack-thread-no-email-reply.png`.

### Channel-grouped record preview and deleted style (2026-11-21)

Owner requested a color treatment for deletion and a realistic multi-channel/multi-thread preview on Alex's existing Person page, and authorized custom Slack tabs on People/Companies. Implemented an app-owned Slack front component and two appended standard-layout tabs. It groups native thread summaries by native Slack Channel relation, collapses channels, opens native threads in the existing side panel, highlights the selected thread, and offers Refresh/Load more. Company rollup reuses the native related-People timeline. The native Messages list now includes chat subjects and message counts.

Deleted chat text is amber and struck through, with a compact amber Deleted tag and trash icon. Authorized content remains copyable; internal deletions from other teammates remain hidden. No shared bubble primitive was changed.

Only getTimelineThreadsFromObjectRecord now permits application-with-user access. Its resolver forces delegated app requests to APP/app channels owned by the calling application, overriding an attempted foreign-provider filter. Other timeline endpoints remain closed to app tokens; application-without-user remains denied. Two resolver tests cover this scope and native-user filter preservation; the 227-case access-policy suite passes. The front component reads native Slack relations after the permission-filtered timeline result.

Synthetic preview now contains three visible channels, seven threads and 25 visible messages, including the original launch thread and its attachments. Added 21 messages via app ingestion; all link to the existing Alex and Company. No live Slack access or production deployment. Person Slack tab runtime ID: c4609c12-69e0-4a3e-9b7e-f3046e453f9f; original Messages tab URL still works.

Verified native Messages view with the original side panel, person/company grouping, channel collapse, another thread in the same channel, a thread in another channel, and light/dark deletion styles. App suite: 57 tests; deleted-message component: 18 tests; scoped frontend/app typechecks pass. Scoped server policy typecheck reports only existing GraphQL-error status and semver declaration failures outside changed files. Screenshots: .context/slack-person-grouped-light.png, .context/slack-person-grouped-dark.png, .context/slack-person-design-thread.png, .context/slack-company-grouped-dark.png. Group list currently refreshes manually; native open threads continue to use existing subscriptions.

### Real-data testing and App preferences (2026-11-21)

Owner explicitly requested their real #posthog channel for testing, and corrected the product entry point to Apps preferences, following LinkedIn. Connected Slack read tools supplied the last 30 days and all replies for the five recent threads. Imported 77 distinct messages into 14 conversations (five multi-message threads and nine standalone posts), deduplicating two thread broadcasts shown in channel history. Bodies, timestamps, Slack IDs, root/reply relations and source permalinks were preserved. Four reaction sets were resolved through the read-only reaction API. No Slack messages were sent or edited.

This is a connected-tool snapshot, not a completed native Slack OAuth connection. The real channel has its own private METADATA message channel and native Slack Channel record, and separate real contact/company test records. It is not associated with the synthetic Alex contact. Temporary import data, record IDs and verification evidence are gitignored in .context/posthog-import; do not copy customer message contents into engineering memory or commits. Read verification confirmed all 77 bodies, correct parent links, no duplicate rows after repeat import, and no channel visibility to a non-owner API key.

The app UI now distinguishes standalone posts from multi-message threads. A standalone post shows its text once and 1 message; multi-message rows show reply counts. Channel headings separately count threads and standalone messages. The same native item becomes a thread when replies arrive.

USER-scoped Sync remains in native Apps preferences, and a LinkedIn-style health action opens the canonical /settings/app-preferences/<applicationId> route. Sync auto-loads the member's data, omits tokenless test connections from live import choices, and shows a per-user imported-snapshot summary. Unit tests enforce member-scoped summary access, no credentials in responses, native preferences routing and standalone-to-thread promotion. Browser verification passed nine standalone rows, five thread rows, a 22-message real thread with source links, and the snapshot summary in native Apps preferences.

Continuous sync remains blocked on obtaining the app's own Slack OAuth authorization; the external connected Slack tool does not hand its bearer token to the VM app. Workspace Slack client/signing credentials remain server-side and per-app; normal member connection and sync controls use Apps preferences. No production deployment or git commit.

### Slack message formatting and multiple leads (2026-11-21)

Owner flagged raw Slack mention syntax and emoji shortcodes in native chat bubbles. Added Slack-only text rendering for labeled mentions, participant-resolved unlabeled mentions, channel mentions, standard emoji including skin tones, safe labeled links, emphasis, strike-through and literal code. Escaped Slack entities render as text; no HTML is executed or remote images loaded. Unknown custom emoji retain their shortcode. Detection reuses the HTTPS Slack permalink guard used by the source-link footer. Original stored bodies and Copy output remain unchanged; other chat providers retain literal rendering. This change covers the opened native thread; app-owned conversation-list previews still use plain summary strings.

Verified current multi-lead behavior in map-message.ts and the native timeline query: each message includes all current channel members as participants; unique primary-email matches link existing People, without creating contacts. Every matched lead can see the same channel context, subject to channel visibility. Company views roll up related People and group by native thread ID, so several matched leads do not duplicate conversations or counts. Company association follows CRM relations, not inferred email domains or channel names. This is channel context, not a filter limited to messages authored by or mentioning the selected lead. Added a multi-lead mapper test including duplicate membership and an unmatched member.

Verification: 24 focused native rendering/clipboard/security tests and five mapper tests pass; scoped frontend/app typechecks and changed-file type-aware frontend lint pass. Real imported thread browser verification passes resolved mentions and body emoji in light/dark mode. Evidence scripts/screenshots are gitignored under .context. VM browser emoji font was updated to support newer Unicode emoji. Preview only; no production deployment or commit.

### Configurable contact creation and internal employees (2026-11-21)

Owner requested email-style Slack contact creation, explicitly excluding internal employees. Apps preferences → Slack Sync → Sync now includes None / Sent / Sent and received, group-address and non-professional-email exclusions, and employee email domains (including subdomains). Preferences are member-scoped in app KV, applied to that member's native app message channels, and inherited on new connections. Default is None. Saving does not start a history import; new messages and later history imports apply the chosen policy. Existing Person links remain when creation is disabled.

Slack mapping supplies optional contactEmail separately from the provider handle, only for eligible external users and guests. Full members of the installing Slack workspace, connected accounts, matched Twenty workspace members, configured employee domains, bots, deactivated users, missing email and unknown Slack team membership are excluded from creation. Employee messages retain sender names and existing workspace-member attribution. Existing People may still be linked, including internal People that were already in the CRM.

Native UpdateAppMessageChannelInput and the SDK helper now accept the existing contact policy and exclusion fields. App participant ingestion accepts a validated contactEmail. ApplicationMessageContactCreationService runs within the existing ingestion lock, uses the native email CreateCompanyAndPersonService for duplicate handling, company reuse, restores and name enrichment, then resolves unique primary/additional-email matches back to Slack participant handles. Workspace-member emails are independently excluded server-side. Deleted messages cannot create contacts. The ordinary email contact queue remains unchanged; APP messages skip that email-handle queue because their contact identity is resolved separately. No entity/schema migration is needed; metadata GraphQL types were regenerated.

Verification: native ingestion/contact/DTO suites pass 23 tests; app suites cover employee classification, guest eligibility, member-owned settings, domain validation, sender policy and existing matching. Direct local API/DB verification created synthetic People/Company records, reused one Company for two leads, preserved participant linkage, avoided duplicates on repeat delivery and respected None/Sent/received plus group/personal/workspace-employee exclusions. Browser save/reload verified policy persistence and normalized employee domains, then restored None with no extra employee domains. The preview's own Slack OAuth is still missing, so real #posthog remains a snapshot. Scoped server typecheck has only the two previously recorded unrelated GraphQL-error/semver errors. Changed server files pass type-aware lint; app typecheck/lint pass. Evidence: .context/slack-contact-creation-integration.cjs, .context/slack-contact-preferences-browser.cjs and .context/slack-contact-preferences.png. Local preview only; no commit, push or production deployment.

### Native preferences UI and shared decision documentation (2026-11-21)

Owner rejected the plain preferences form. Rebuilt the screen with Twenty UI radio cards, the email policy illustration, native switch/card rows, a native domain input with its own Save action, and native buttons/selects. Policy/exclusion changes save automatically without stacking success notifications. Disconnected history shows a connection prompt; imported snapshot counts are a compact notice. Main labels use primary text, descriptions use tertiary text, and the layout follows native settings spacing. Domain clearing required forwarding native input events through the remote renderer; both empty and nonempty saves now persist. Preference patches merge with the latest saved values, preserving domains across policy/toggle changes.

Browser verification passed auto-save, switches, domain normalization/save/clear/reload, keyboard radio navigation, native select popups and selection, and light/dark rendering. Connected-history controls were exercised with browser-only response fixtures; no history import was started. Actual member preferences were restored to None, both email exclusions enabled, and no extra employee domains. App typecheck/lint pass. Evidence: .context/slack-native-preferences-browser.cjs, .context/slack-native-history-browser.cjs, .context/slack-native-preferences-light.png and .context/slack-native-preferences-dark.png.

Owner then requested the shared docs/decision guide and Ruler setup from sunny/mono, documenting Slack only. Both repositories contain the decisions skill; installed the exact mono source at commit 94038532154c12f58e51e01a99a0769d1a169f6e under .agents/skills/decisions, with Claude/Pi aliases and a source pin. As mono's authoring guide specifies, skills remain canonical under .agents; Ruler owns rules. Root .ruler/instructions.md preserves the prior Twenty instructions; new authoring/decision rules reference docs. The pinned ruler:apply script uses Ruler 0.3.46, generates CLAUDE.md, and retains the existing AGENTS.md alias. MCP, skills propagation, nested rewriting, backups and gitignore mutation are disabled for this setup. Repeated generation is idempotent; .mcp.json, .codex/config.toml and .claude/settings.json hashes are unchanged.

Slack implementation docs are in docs/slack-sync.md; docs/DECISIONS.md indexes twelve Slack decision records under docs/decisions/slack, including exact owner quotes and three historical records from the supplied Claude JSONL export (2026-11-19/20). Customer conversation bodies and credentials remain excluded. Documentation links and the installed skill's upstream blob hash were verified. Sunny/mono application code and infrastructure configuration were not imported. No commit, push or production deployment.

### Pull request preparation (2026-11-21)

Owner requested a PR for the current implementation. Fetched main, now c62fc55d3e, which advances the framework from this tested 2.60 branch to 2.61 and includes separate Ruler/decision/preview work. The current Slack state is being opened as a draft, with upstream integration and current-version upgrade reconciliation explicitly outstanding. No production deployment or merge is authorized by the PR request. Decision 0013 and the implementation guide record that distinction.

Fresh PR checks: all 77 app tests, 123 focused server tests across 21 files, and 46 focused frontend tests across seven files pass. The server selection includes ORM/provider row visibility, subscriber isolation, ingestion, contact creation, folder bindings and shared-thread behavior. Formatting review found and fixed two whitespace-only issues. Credential-pattern review scanned 224 changed text files with no matches; ignored VM credentials, real channel artifacts, node_modules, build outputs and app manifests remain excluded. Known full-server typecheck errors and current-main integration are not claimed as passing. SDK/CLI checks and the final PR URL are recorded in the review description and session response.

### Review artifact (2026-11-21)

Draft PR: https://github.com/fundlevel-digital/twenty/pull/10, from fundlevel/slack-sync-app into main. Implementation commit: 0e159bc50b. Fresh validation totals 323 focused tests: 77 app, 123 server, 46 frontend, 68 CLI and 9 SDK, all passing on the tested 2.60 baseline. Git's non-mutating merge preview reports 14 conflicts with main c62fc55d3e (now Twenty 2.61), including shared Ruler/docs sources and core messaging changes. Resolve upstream integration and current-version upgrade requirements before merging. Existing main documentation and preview skills must be retained. No live CRM deployment or merge was performed; the VM preview and its worker remain supervised.

### Main integration (2026-11-21)

Owner authorized merging remote main into this branch, resolving conflicts, committing and pushing. Integrated main `a691dd35aa6db0df6315bd4555b9bbb038fa0fc1`, retained its Ruler and other application documentation, adapted Slack subscriptions/rendering to the new APIs, and registered Slack upgrades under 2.61 with fresh append-only timestamps. All 330 focused tests pass; app/scoped frontend typechecks pass. Expanded scoped server typechecking retains semver declaration and error-status diagnostics in four files unchanged from main. The preview is isolated on the verified pre-merge 2.60 source; the live CRM is unchanged. See the [integration handoff](docs/handoffs/2026-11-21-slack-main-integration.md) and [decision 0014](docs/decisions/slack/0014-integrate-main-and-push.md) for current status, paths and verification limits. Earlier entries above describe historical states.
