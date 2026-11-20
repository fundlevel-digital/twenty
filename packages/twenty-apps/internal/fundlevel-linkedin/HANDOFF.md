# Handoff: LinkedIn app unification (fork session, 2026-11-19/20)

Branch: `fundlevel/linkedin-app-unification` on `fundlevel-digital/twenty` (remote `org`, mirrored to `kareem717/twenty`).

It starts from `b90a83177a`, the head of our LinkedIn Sync app (`fundlevel/linkedin-sync-app`). It adds only this file. The branch is based on `b15af5d772` and is **6 commits behind `main`**. Before building, rebase or merge `org/main`. That brings in the official app's latest fixes (`e8d33cb03d`) and the YouTube app.

## What this fork is about

Fundlevel has **two LinkedIn apps installed** on the live CRM (https://crm.fundlevel.co, workspace `3b424be9-f8da-41b6-b564-16c9da2df4e1`, schema `workspace_3iaq1z1s1jv5ol6qhlcwulwbl`).

The owner wants to **keep our own app**, "LinkedIn Sync" (`packages/twenty-apps/internal/fundlevel-linkedin`), and bring in the official app's best parts. Owner's words: "I like the idea of storing as msgs, per user connections, configuration (privacy, etc.)", and "examine the linkedin app (official) and find the parts that are rly good and bring into our own (u can propose to me first)".

**Where we left off.** Both apps were inventoried in full and a proposal was given (below). **The owner has not approved it yet or answered the four open questions.** No code has been written for the unification. Do not start building until the owner answers.

## The two apps today

### Official "LinkedIn" (`packages/twenty-apps/public/linkedin`; latest code on `main`)

- **No custom objects.** It writes into Twenty's core messaging through SDK helpers: `createMessageChannel`, `ingestMessages`, `updateMessageChannel`, `uploadMessageAttachment`.
- **Messaging provider:** registered with `defineMessagingProvider` in `src/messaging-providers/linkedin-messaging.ts`, including send-reply and mark-as-read functions.
  - The server dedups on `externalId` (Unipile message id) and threads on `threadExternalId` (Unipile chat id).
  - Ingest takes at most 100 messages per call.
- **Per-member connection:** `defineConnectionProvider` with `scope: 'USER'`.
  - Authorize creates a Unipile hosted-auth link. It moves Twenty's `state` into Unipile's `state`, expires after 1 h, and lets the member set a proxy and country.
  - The callback checks the provider is linkedin and the account was created less than 1 h ago.
  - `onConnect` creates one message channel per member with `visibility: 'METADATA'`. It then claims the SERVER-scope kv key `unipile-account:<id>`, which the server pins to the workspace and uses for webhook routing.
  - Disconnect and uninstall **delete the Unipile account**.
- **Per-member settings:** kv `linkedin-settings:<connectedAccountId>`, shown at Settings → App preferences → LinkedIn → Sync.
  - Front component `src/front-components/linkedin-settings.front-component.tsx`, built with twenty-ui.
  - Visibility is stored on the channel itself: Everything or Metadata.
  - Other settings:

    | Setting | Values | Default |
    |---|---|---|
    | `importPolicy` | ALL / CONTACTS_ONLY | ALL |
    | `areGroupChatsImported` | on / off | on |
    | `historyConversationLimit` | 0 / 10 / 20 / 50 | 20 |
    | `contactAutoCreationPolicy` | SENT_AND_RECEIVED / SENT / NONE | SENT |
    | `isNameMatchingEnabled` | on / off | on |
    | `areChatsMarkedAsRead` | on / off | off |
- **Webhooks:** one server-wide endpoint, `linkedin-webhook-resolver.ts`, using `serverRouteTriggerSettings`.
  - HMAC check over `${t}.${rawBody}`, 5-minute tolerance, `timingSafeEqual`.
  - It routes to the claiming workspace and calls `linkedin-handle-webhook-event`.
  - Only `message.new` and the account-status events are handled.
- **History import:**
  - **Plan:** `linkedin-plan-history-import.ts` picks the most recent N chats and splits them into chunks of 20, stored in kv.
  - **Import:** `linkedin-import-history.ts` handles one chunk at a time, saves progress after each page, and resumes on budget or rate limit.
  - **Guards:** deterministic job ids and `runId` guards; cancel is supported.
  - **Self-healing:** `refresh-linkedin-history-import-state.util.ts` runs on every settings GET (the UI polls every 2 s). It re-queues lost jobs and marks stalled ones.
- **Rate limits:** `src/unipile/utils/request-unipile.util.ts` parses "retry in N …", waits in-process up to 5 times, then throws `UnipileRateLimitError(retryAfterSeconds)`. The jobs turn that into a delayed job, and the UI shows "resumes at".
- **People matching:**
  - Slug cache in kv: `linkedin-public-identifier:<id>`.
  - `ilike` on `linkedinLink.primaryLinkUrl` with NFC, NFD and URL-encoded variants.
  - Optional fallback on a unique first+last name, written back conditionally.
  - Auto-create uses a deterministic Person id, a SHA-256 of `linkedin-person:<slug>` formatted as a UUID, so concurrent creates collide instead of duplicating.
  - Avatars are uploaded only where the avatar is still empty.
- **Attachments:** all-or-nothing within a deadline, so no orphan uploads.
- **Tests:** about 45 unit test files, about 230 cases. Code quality is high.
- **Gaps:**
  - no catch-up cron, so missed webhooks are lost;
  - history capped at 50 conversations;
  - no connections or invitations, no Sales Navigator or InMail;
  - no reactions, edits or deletions;
  - cannot start new conversations, only reply.
- **Live data:** channel `linkedin.com/in/kareemyakubu` (type APP, METADATA visibility) holds 131 messages in 18 threads.
- **Config:** server variables `UNIPILE_API_KEY` and `UNIPILE_WEBHOOK_SECRET` (Settings → Developers → Apps → LinkedIn → Config). Webhook resolver id `292fe4de-13d4-4fbb-bf76-0f879109b2c2`.
- **Changes this session** (on `main`, commit `e8d33cb03d`):
  - the hosted-auth link sets `config.global.allow_user_proxy_override` and `allow_user_country_override`, so members choose a proxy when connecting;
  - `list-unipile-chats.util.ts` caps each page at `UNIPILE_CHATS_PAGE_MAX_SIZE = 25`, Unipile's limit.

### Ours, "LinkedIn Sync" (`packages/twenty-apps/internal/fundlevel-linkedin`, this branch)

- **Objects:** `linkedinAccount`, `linkedinConnection` (central, keyed by `syncKey = <accountUserId>:<ACoA id>`), `linkedinChat`, `linkedinMessage`.
  - Person gets `linkedinMemberId`, `linkedinNumericMemberId`, `linkedinSalesNavigatorId` and the `linkedinConnections` relation.
  - WorkspaceMember gets `linkedinAccounts`.
- **Live counts:** accounts 2, chats 144, messages 821, connections 1,576.
- **No message written since 2026-11-15**, so the message sync may be stalled. Not investigated.
  - Chats and connections were last updated on 2026-11-17; an account was updated on 2026-11-19.
- **Accounts:**
  - One shared `UNIPILE_API_KEY` application variable, plus `UNIPILE_WEBHOOK_SECRET`, `ARCHIVE_URL` and `ARCHIVE_TOKEN`.
  - No connect flow: accounts are connected in Unipile directly and discovered by `/accounts` every 3 h or by webhook.
  - The `owner` field is set by hand and not used for anything.
- **Secrets** live in Infisical project `fundlevel`, env `prod`:
  - `/shared/unipile`;
  - `/apps/unipile-archive`, pushed to Cloudflare with `worker/scripts/push-secrets.mjs`;
  - `/apps/twenty-linkedin-sync`, copied into the app settings by hand.
- **Sync** (`src/sync/*`):
  - `sync-tick` every 5 min is a resumable per-account state machine: Connections, then Chats (six inboxes: Classic primary, archived and InMail; Sales Navigator primary, archived and sent), then Messages, then Complete.
  - Messages have unlimited full history, with per-chat newest/oldest cursors.
  - Webhooks (`src/logic-functions/unipile-webhook.ts`, `src/sync/live.ts`) are treated as hints that trigger a re-read.
  - All writes are upserts on unique keys.
  - Calls are spaced 2.1 s apart, and a 429 is waited out.
- **People matching:** exact member ID first, then the profile-URL slug. An ambiguous slug links nobody; people are never created. `person.created`/`person.updated` triggers link pending connections.
- **D1 archive Worker** (`worker/`):
  - Stores raw Unipile objects plus an append-only webhook event log.
  - Forwards webhooks to Twenty and replays failures every 10 min, up to 5 attempts within 24 h.
  - The app archives each page at least once, with 3 retries before failing the step.
- **UI:**
  - A People → "LinkedIn" tab: `src/front-components/linkedin-conversation.front-component.tsx` with inline styles.
  - A LinkedIn sidebar folder, plus four "All …" views.
  - No settings page and no commands. The only control is editing `syncStage` by hand.
- **Tests:** only `src/lib/mappers.test.ts` (10 cases) and `src/lib/webhook-signature.test.ts` (2).

## Known bugs in our app (from the code read; none fixed yet)

1. **No privacy.** The People widget queries with `TWENTY_APP_ACCESS_TOKEN ?? TWENTY_API_KEY`, so anyone who opens a Person sees every account's messages.
2. **Newest messages hidden.** The widget fetches `messages(first: 500, orderBy sentAt Asc)`, so chats with more than 500 messages lose their newest messages.
3. **Invitation statuses go stale.** After `Complete` nothing polls, so they stop updating. The statuses Withdrawn, Declined, Removed and Ignored, the `withdrawnAt` field, both numeric-ID fields and the Company Page channel are never written.
4. **The sync-tick run lock isn't atomic.** It does a kv get, then a set.
5. **Call spacing isn't per account.** It is per client instance, so webhooks, the sync tick and the refresh can hit one account at the same time.
6. **Duplicate connections possible.** Sales-Navigator-only contacts keyed `:ACwA…` never merge with a later `:ACoA…` record.
7. **Ambiguous account upsert.** It sends two unique fields at once, and the re-link case is untested.
8. **The Worker waits too long.** It blocks up to 90 s on the forward to Twenty before answering Unipile (no `ctx.waitUntil`), so Unipile may redeliver.
9. **Person lookup misses secondary links.** During a sync it only checks `primaryLinkUrl`; the triggers also check secondary links.
10. **Silent failures.** Errors from `fillPersonIds` are ignored. A chat that fails 3 times is marked complete, leaving a permanent gap.

## Proposal given to the owner (awaiting approval)

Keep our app and rebuild its core on the official app's design.

1. **Messages into core messaging.** Register as a messaging provider. Migrate the 821 messages and 144 chats into core messaging, then remove the `linkedinMessage` and `linkedinChat` objects. Threads then show beside email on People, Companies and the timeline, and reply and mark-as-read work from Twenty's inbox.
2. **Per-member connection.** Use a hosted-auth connection provider (scope USER) with the proxy override, the official callback safeguards, and the sign-out banner. One channel per member.
3. **Per-member settings page.** Port the official settings and add **"All" history** and **Sales Navigator / InMail inbox** toggles.
4. **Sync engine:**
   - official webhook routing (SERVER kv claim plus `serverRouteTriggerSettings`) and HMAC check;
   - official planned, chunked, resumable history jobs with self-healing, extended to unlimited history with our per-chat cursors;
   - **keep our catch-up cron**;
   - official rate-limit handling, with call spacing shared per account (in kv).
5. **People matching:**
   - our member-ID match first, then the official slug and name fallbacks;
   - deterministic Person ids for auto-create;
   - conditional writes for avatar and URL;
   - all-or-nothing attachment import.
6. **Connections.** Keep `linkedinConnection` as a custom object, owned per member, with periodic invitation and status polling.

**Phases:**
1. Connect flow, core messages and settings.
2. History and catch-up.
3. Connections and the migration of existing data.

**Open questions (unanswered):**
1. Migrate the 821 messages and drop our Message and Chat objects? Recommended: yes.
2. Connection visibility: whole workspace, or owner only?
3. Keep the D1 archive Worker, or drop it?
4. How to retire the official app? **Its uninstall and disconnect delete the Unipile account.** Unipile bills about $10 a month per account, so the same LinkedIn is probably connected and billed twice right now. Switch over first, then disconnect the official app's account before uninstalling, so it can't delete an account our app uses.

## Operating notes

- **Apply an app:** `npx -y twenty@2.59.0 --no-input app apply --no-prune` from the app directory (add `--create` on first install). Saved remote `fundlevel` (apiUrl `https://crm-login.fundlevel.co`) lives in `~/.twenty/config.json`.
- **Run a logic function:** `npx -y twenty@2.59.0 app exec --name <fn> --payload '<json>'`.
- **Raw API calls:** `npx -y twenty@2.59.0 --no-input api graphql [--metadata] --query @q.graphql --variables @v.json`.
- **App typed clients can't see objects from other apps.** They only include standard objects and the app's own. To touch another app's objects (for example Person custom fields from the Custom app), use raw GraphQL through `RestApiClient({ runAs: 'application' })` posting to `/graphql`. This bit the YouTube Analytics app (`packages/twenty-apps/internal/youtube-analytics` on `main`), which shows the pattern.
- **SQL on the live DB (read-only checks):**

  ```bash
  ssh claudy "cd /mnt/storage/twenty-crm && docker compose exec -T db psql -U postgres -d default"
  ```

  - Message channels are in `core."messageChannel"`.
  - Our tables are `workspace_3iaq1z1s1jv5ol6qhlcwulwbl."_linkedinMessage"` and so on; custom tables carry a `_` prefix.
- **Server deploys:** see `~/.claude/projects/-Users-kareem-dev-projects-twenty/memory/claudy-twenty-deployment.md`. Apps don't need a server image; `app apply` is enough.
- **Owner rules:**
  - never take backups or pg_dumps on claudy;
  - no AI attribution in commits or PRs;
  - don't do work that wasn't asked for;
  - never run full typechecks, nx, or Docker builds on the owner's 16 GB Mac. Use single-file vitest/jest, or a memory-capped tsgo (`GOMAXPROCS=1 GOMEMLIMIT=3GiB nice -n 15 tsgo --singleThreaded`) on a temporary tsconfig listing only the changed files.

## Related branches and sessions

- `fundlevel/linkedin-sync-app`: our app as it was, the same commit this branch starts from.
- `linkedin-hosted-auth-proxy` (origin): an earlier version of the proxy change, superseded by `e8d33cb03d`.
- The general session handoff, covering deploy pipeline, lookup columns, YouTube app and the OAuth fix, is at `~/Documents/twenty-handoff-2026-11-19.md`.
- Transcripts:
  - parent session `16b3ec70-5a06-4d0d-9386-0c8e29bad26e`, under `~/.claude/projects/-Users-kareem-dev-projects-twenty--claude-worktrees-enchanted-prancing-duckling/`;
  - this fork `ba86c1d0-4bec-4c94-958a-67893720dec4`, under `~/.claude/projects/-Users-kareem-dev-projects-twenty--claude-worktrees-proud-snuggling-lantern/`.
