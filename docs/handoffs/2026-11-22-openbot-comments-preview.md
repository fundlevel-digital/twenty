# OpenBot Comments Integration And Preview

**Architecture correction:** The bundled implementation below is historical.
The [standalone app handoff](2026-11-22-openbot-standalone-preview.md) and
[OpenBot README](../../packages/twenty-apps/internal/openbot/README.md) describe
the current ownership and setup.

Kareem requested OpenBot mentions and attributed replies in the new Comments
app, plus an isolated VM preview. See the [decision](../decisions/openbot/0001-bot-participants-and-vm-preview.md).

## Source

The workspace remains on `conductor/openbot-app-for-crm`. The Comments base was
fast-forwarded from `conductor/attio-comments-app`, commit
[`46d5685169`](https://github.com/fundlevel-digital/twenty/commit/46d5685169eb4471e74b808fe5d8e62fc2a61b6b).
The follow-up merge
[`344b548ce4`](https://github.com/fundlevel-digital/twenty/commit/344b548ce4)
includes the native Comments sidebar, metadata transport and renderer popup fixes
from `aff759f05f`, `28eb784248` and `3041555aae`, preserving bot identities and
mention caret handling. The additional integration lives in
[the Comments app](../../packages/twenty-apps/internal/comments/README.md), with
[OpenBot setup instructions](../../packages/twenty-apps/internal/comments/src/openbot/README.md).

## Behavior

- Configured agents join the mention picker and support typing `@`.
- Agent profiles expose only stable identity, name and avatar. Webhook URLs and
  signing secrets remain in encrypted application variables.
- A human mention queues a signed `crm.comment.mentioned` event. Queue and Inbox
  operations use the application identity explicitly; source-record access is
  still checked with the triggering member's delegated token.
- Unavailable hosts retry with exponential backoff, up to ten retries, using the
  same event ID and body. Accepted events display **Sent to OpenBot**, because
  OpenBot can accept an event without starting a paused or filtered routine.
- The callback has a task-specific signing credential, timestamp check and
  seven-day expiry. Server-side task metadata fixes the author and destination.
- Replies use an explicit Bot author kind, stable author name, avatar and badge.
  Their deterministic UUID and Inbox idempotency key handle duplicate callbacks.
  Bot-authored replies cannot trigger other bots.
- Source threads must still be open when a queued task is sent or a reply arrives.
  Comments and bot status use the app's existing Refresh behavior.

## Isolated Preview

Preview: <https://fundlevel-w928.conductor.show/>. Sign in through Conductor, then
use the prefilled Twenty demo sign-in form; neither field requires typing. Open **Acme Demo**, run **Comments** from its
record command menu, and mention **Preview Bot**.

PostgreSQL 16 and Redis 7 use separate Docker containers and a dedicated named
PostgreSQL volume in this VM. The CRM server and queue worker were built from
this checkout. The initial preview used a cached public CRM shell. It now serves this
checkout's source Vite frontend through the preview proxy. Both the embedded
sandbox/worker document and renderer package were rebuilt; no independent worker
asset override is used. Every application API is proxied to this VM. No production CRM data was copied or changed.

A private supervisor in `.context/preview-supervisor.py` restarts the server,
worker, frontend proxy and local test bot if a child exits. A separate detached source-Vite supervisor restarts the frontend process.
The VM needed 4 GiB of temporary swap during source compilation; this is private
preview infrastructure and is not a production configuration. The containers
have restart policies. These processes survive a command-tool return; VM shutdown
survival or an automatic wake action is not claimed.

The local test bot verifies the outgoing signature and sends a signed callback.
Its answer explicitly says it is a local integration test. No live OpenBot
agent, provider account, paid model or other external task was executed. Private
runtime configuration, TLS keys, local test credentials and browser state remain
untracked under `.context/` and the private server environment.

## Verification

- Typecheck, installable CLI build/apply, formatting and whitespace checks pass.
- All 45 unit and UI tests pass after the native-sidebar merge. They cover the existing Comments behavior plus signing, retries,
  public profile sanitization, task-scoped reply authentication, expiry, forged
  author/record fields, closed threads, duplicate replies, typing mentions and
  bot reply identity.
- Live API checks verified the mention directory, saved comment, queued worker
  delivery, attributed reply, and requesting member's Inbox notification.
- A repeated signed callback returned 200 without a second bot reply. A forged
  signature returned 401. The final status reached **Replied**.
- The renderer's two focused regression suites pass all 25 tests; changed
  renderer files pass oxlint and oxfmt. Full renderer typechecking is blocked by
  missing dependency declaration outputs after the direct Vite bootstrap; this
  is not reported as a typecheck pass.
- Fresh source-Vite login verifies both seeded fields are prefilled without
  automation filling either field, and completes with no page errors.
- Fresh sandbox checks verify `document.body instanceof HTMLElement` is true
  and the computed body position is `relative`. In a 1500px viewport, the native
  filter popup has x=1288, width=200, right=1488, fully inside the viewport.
- Backend and proxy health return 200. Browser login and the record page load
  without page errors. The Comments command opens the native sidebar.
- The merged native sidebar passes filter selection and deletion-confirmation
  cancel checks. Blocking browser `/s/comments` requests still permits saving
  through the metadata transport and receiving a fresh signed demo reply.
- Native browser interaction verifies typing `@Pre`, selecting **Preview Bot**,
  continued typing after the inserted mention, submitting a follow-up reply,
  and another bot response in the same thread. The initial sidebar was checked
  in light/dark mode; current source-host verification is in light mode. Browser
  page errors: none.
- Browser checks use the exact HTTPS preview origin with local TLS and host
  mapping, bypassing Conductor's edge. An anonymous public health request returns
  its expected 401 sign-in gate; authenticated public-edge access has not been
  independently verified.

## Limits

A real OpenBot routine still needs its webhook URL/signing secret configured,
plus a routine instruction/tool that sends the documented callback. A webhook
acknowledgment alone cannot create the agent's CRM reply. These participants are
not ordinary Twenty login accounts, task assignees or record owners.

The existing Comments limitations remain: explicit Refresh, emoji insertion
without reactions, record links that require opening Comments, and Inbox
notifications whose replies do not synchronize back to Comments. The callback
and outgoing worker enforce bot-specific access; this does not alter the
workspace administrator's direct API permissions on the comment object.

Automatic enrollment/profile sync and the approved Send to OpenBot/Get Request
Status workflow blocks remain future work. Sender-owned routine secrets are
supported by OpenBot, but setting one requires an owner/admin host session on its
loopback Team API. See [the workflow and signing decision](../decisions/openbot/0003-workflow-actions-and-sender-secrets.md).

The Comments workspace is implementing recipient validation, richer typed-mention
autocomplete, Company/Person record tabs and an inbound Inbox demo. Those
follow-ups are not included in this merge. Connection privacy remains dependent
on clarification in that workspace. This workspace has left those files alone.


## Paused Checkpoint

OpenBot work is paused at Kareem's request while standalone Comments is finished.
See [the pause decision](../decisions/openbot/0004-pause-openbot-for-comments.md).
Source through `33a4bdf40d` is pushed, including the Comments follow-up merge and
picker separator fix. The app was installed in w928; all 60 app tests, app
typecheck, and 47 focused renderer tests pass. Fresh prefilled login passes.
The latest combined tab/sidebar bot browser check did not complete successfully;
it must be resumed and verified later before claiming that interaction passes.
The existing source, private runtime helpers and preview state are preserved.
Privacy remains unresolved. No further bot implementation or verification is
being performed during this pause.


## Rebase Onto Main

Kareem requested: "rebase to main". Rebased onto `eb4afbe5b2`, retaining main's
standalone Comments, record-grouped Inbox, renderer fixes and release records.
Comments commits already included in main were omitted from the replay; bot
changes were resolved against the current Comments implementation. The Hindsight
retirement decision is now root 0009, preserving main's existing 0007/0008.

After conflict resolution, all 87 combined app tests and the direct app typecheck
pass. The working tree contains no new host renderer changes relative to main.
The preview was not rebuilt or reinstalled during the rebase. OpenBot remains
paused; the previously unfinished combined browser check remains unverified.


## Manual Webhook Scope After Resuming

Kareem resumed CRM work and then directed: "DO NOT touch my live openbot" and
"I'll just configure the webhookroutines by hand". No live OpenBot access or
changes occurred. The automatic connector experiment was removed before any
installation; only ignored local artifacts retain it. See
[decision 0005](../decisions/openbot/0005-resume-crm-with-manual-webhooks.md).

The additional source exposes Send to OpenBot and Get Request Status as Twenty
workflow actions using the existing manual webhook integration. Both require a
workspace-member context and reuse source-record access checks. No new app
object, connector endpoint, connector secret or enrollment UI is included.
Verification of these actions is local tests, direct typecheck and installable
app build; this is not a claim of live OpenBot pairing or production deployment.


## Current VM Preview After Latest Main Rebase

At Kareem's request, rebased onto `fd762241da` and rebuilt/installed the app into
w928 without pruning: three metadata entities created and two updated, with no
metadata deletions. All 92 app tests, direct app typecheck and CLI build pass.
Existing seed data and the local Preview Bot connection were retained.

Installed Send to OpenBot and Get Request Status actions were executed through
the metadata API as a seeded member. The send saved a new record comment, the
worker delivered its signed webhook to the VM-local test endpoint, and the status
action returned Replied with the local demo answer. The browser displayed that
specific comment and attributed bot reply. Typing a multiword fragment, selecting
with Enter and continuing at the caret passed with no browser page errors.
This checks installed action execution, not a complete workflow-editor run.

Fresh source-Vite login completed with email and password already filled and no
input filling by automation. Server and proxied health return 200. The published
preview is still <https://fundlevel-w928.conductor.show/> on port 3001. Browser
checks use VM-local TLS and hostname mapping; anonymous public-edge access returns
the expected Conductor 401 gate. Authenticated edge access was not independently
verified. Current screenshots are in ignored `.context/openbot-final-preview.png`
and `.context/openbot-final-mentions.png`.

Server and worker now also preload a VM-only fetch guard that rejects non-loopback
HTTP destinations during OpenBot verification. The source frontend, backend,
worker, proxy and local test bot run under detached restart supervisors; isolated
PostgreSQL/Redis and the persistent preview volume were restored after the VM
restart. Temporary swap is enabled for frontend compilation. This does not claim
survival of VM shutdown or a wake mechanism. No live OpenBot access, production
change or paid model call occurred.

## Bot Settings, Task Assignments And Reminders

The current branch is rebased onto main `35c1561ae0`. Open **Settings → Apps →
Comments → OpenBot** for the directory and separate, reloadable bot configuration
pages. The app remains bundled with Comments. Settings use native Twenty
controls and confirmation dialogs. Apps permission is checked on the server;
secret reads return only a configured flag, and a blank secret preserves the
existing encrypted value. Bot creation, renaming, enable/disable and removal
change CRM configuration only. OpenBot routines remain manually configured.

Saved Tasks now show a Bots group in the native Assignee picker. Multiple bots
can coexist with the human assignee; `assigneeId` keeps its original human
meaning. The app owns the `openBotAssignees` UUID-array storage and hides its raw
column in standard views. A focused host picker/display adapter recognizes the
app field's universal identifier. The native overflow list handles long names,
and bot avatars use the native assistant avatar. Generic human assignments and
native Task permissions remain in place. New-record forms do not add bots before
the Task is saved; API callers can supply bot IDs at creation.

Opted-in policies send assignment, advance warning, due and repeating overdue
events using the existing signed webhook and callback protocol. Database events
schedule delayed jobs for the next due-time boundary; a paginated minute scan
reconciles settings and assignments. Every send/reply rechecks task eligibility.
Completed/deleted tasks, removed assignments, changed due dates and disabled bots
stop stale work. Bot replies remain comments and do not mark Tasks complete.

The native workflow **Overdue Bot Reminders (Enable Sending to Start)** includes
the **Send Overdue Task Reminders to Bots** action, a minute timer and a
60-minute overdue interval. Its sending input is false. Duplicate the managed
starter, set the interval and enable sending in the copy. Existing Send to
OpenBot/Get Request Status actions remain available. See the maintained
[setup and protocol](../../packages/twenty-apps/internal/comments/src/openbot/README.md)
and [owner decision](../decisions/openbot/0006-bot-settings-and-task-assignment.md).

Main's native enum requirement is also included. Since installed field types
cannot change in place, `authorType` is a new Select with Human/Bot/System
options. Legacy `authorKind` remains compatible, and new writes maintain both.
The post-install hook backfills older classifications without altering IDs,
text or authors. In this development preview the explicit backfill preserved
24 existing comments, then updated zero on repetition. Development `app apply`
requires explicitly running/verifying that hook; release installs/upgrades have
the post-install hook registered.

Verification on the rebased source:

- All 108 app tests, direct app typecheck and CLI build pass. Five host tests and
  targeted type-aware lint pass; host formatting passes. Shared runtime and
  declarations were rebuilt after rebasing, using direct Vite/declaration builds
  after Nx stalled. Full CRM typecheck is not reported passing: the first run
  exposed incomplete SDK declarations/type mismatches, and its retry exceeded
  VM memory.
- Installed settings reads masked secrets. Browser configuration edits persisted
  with the secret blank; the native Add Bot form created Review Bot, and its
  separate URL reopened with an empty password input. Stale async form loads and
  navigation during save were corrected. The directory shows both demo bots.
- Actual native Task UI showed a bot-only assignee. Keyboard Space selected a
  second bot, and both assignments survived a full reload. A temporary long bot
  name verified the overflow count/popover; the demo name was then restored.
  No browser page errors or browser-local API requests occurred.
- Signed local roundtrips verified assignment, due-soon, due and overdue events.
  Repeated scans/workflow dispatch queued no duplicates within the same cycle.
  Completion stopped reminders and rejected a signed late callback with 409.
  A created Task scheduled and received its due reply without a manual tick.
- The supplied native workflow completed through its logic-function node with
  sending disabled. Installed Send/Get Status actions also returned a local
  demo answer after the author-kind upgrade.
- A fresh source-Vite session verified that email and password were already
  filled and login needed no typing. The source frontend, backend, worker and
  local bot run under detached restart supervisors, with isolated persistent
  PostgreSQL/Redis data. This does not claim survival of VM shutdown.

The preview is <https://fundlevel-w928.conductor.show/>; Conductor sign-in still
applies. Browser verification maps that hostname to VM-local TLS and bypasses
the Conductor edge. Anonymous edge access returns its expected sign-in gate;
an authenticated edge session was not independently verified. Current ignored
screenshots are `.context/openbot-settings-directory.png`,
`.context/openbot-settings-bot.png` and `.context/openbot-task-assignees.png`.

Both seeded bot profiles point only at the VM demo endpoint. The server/worker
fetch guard still rejects non-loopback destinations. No live OpenBot access,
routine changes, paid model calls or production deployment occurred. Preview
schema updates removed an obsolete generated field widget; comment records were
preserved.
