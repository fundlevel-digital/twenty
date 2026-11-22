# OpenBot Comments Integration And Preview

Kareem requested OpenBot mentions and attributed replies in the new Comments
app, plus an isolated VM preview. See the [decision](../decisions/openbot/0001-bot-participants-and-vm-preview.md).

## Source

The workspace remains on `conductor/openbot-app-for-crm`. The Comments base was
fast-forwarded from `conductor/attio-comments-app`, commit
[`46d5685169`](https://github.com/fundlevel-digital/twenty/commit/46d5685169eb4471e74b808fe5d8e62fc2a61b6b).
The additional integration lives in
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
use the seeded Twenty sign-in form. Open **Acme Demo**, run **Comments** from its
record command menu, and mention **Preview Bot**.

PostgreSQL 16 and Redis 7 use separate Docker containers and a dedicated named
PostgreSQL volume in this VM. The CRM server and queue worker were built from
this checkout. The frontend is a cached copy of the deployed public CRM shell,
with its production client configuration removed and every application API
proxied to this VM. No production CRM data was copied or changed.

A private supervisor in `.context/preview-supervisor.py` restarts the server,
worker, frontend proxy and local test bot if a child exits. The containers have
restart policies. These processes survive a command-tool return; VM shutdown
survival or an automatic wake action is not claimed.

The local test bot verifies the outgoing signature and sends a signed callback.
Its answer explicitly says it is a local integration test. No live OpenBot
agent, provider account, paid model or other external task was executed. Private
runtime configuration, TLS keys, local test credentials and browser state remain
untracked under `.context/` and the private server environment.

## Verification

- Typecheck, installable CLI build/apply, formatting and whitespace checks pass.
- All 41 unit and UI tests pass. They cover the existing Comments behavior plus signing, retries,
  public profile sanitization, task-scoped reply authentication, expiry, forged
  author/record fields, closed threads, duplicate replies, typing mentions and
  bot reply identity.
- Live API checks verified the mention directory, saved comment, queued worker
  delivery, attributed reply, and requesting member's Inbox notification.
- A repeated signed callback returned 200 without a second bot reply. A forged
  signature returned 401. The final status reached **Replied**.
- Backend and proxy health return 200. Browser login and the record page load
  without page errors. The Comments command opens the native sidebar.
- Native browser interaction verifies typing `@Pre`, selecting **Preview Bot**,
  continued typing after the inserted mention, submitting a follow-up reply,
  and a second bot response in the same thread. Light and dark modes were
  verified in the native sidebar. Browser page errors: none.
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
