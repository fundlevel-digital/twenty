# OpenBot Comments Integration And Preview

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
