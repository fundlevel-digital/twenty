# OpenBot In Twenty

OpenBot is a standalone Twenty app. Bots have stable IDs,
profiles, webhook credentials and task notification policies. They are separate
from Twenty login accounts. The CRM does not create or change OpenBot routines.

## Configure Bots

Open **Settings → Apps → OpenBot → Bots**. The directory opens a separate,
reloadable configuration page for each bot.

1. Create and enable a webhook routine manually in OpenBot.
2. Choose **Add Bot**, enter its name, optional HTTPS avatar URL, webhook URL and
   signing secret (at least 32 characters), then save. Twenty generates its UUID.
3. Set **Reply URL** to this CRM's public HTTPS `/s/openbot/reply` URL.
   An authenticating reverse proxy must allow the signed callback route.
4. Enable the task events and intervals wanted for that bot. All notification
   switches default to off.

Managing settings requires the member's native **Apps** permission. Credentials
are stored in the encrypted `OPENBOT_CONNECTIONS` application variable. The form
receives a configured flag instead of the secret; a blank secret preserves the
existing value. `OPENBOT_REPLY_URL` stores the callback URL. Advanced integrations
can still use the native application variables API or invoke `openbot-config`
through the metadata API with the same member permission checks.

Renaming a bot preserves its ID. Disabling or removing it blocks new delivery and
callbacks, while past comments and task assignments remain. Replace the URL or
secret on its configuration page to change routines. Rotating a secret also
invalidates outstanding callbacks signed using the old secret. Manage the
corresponding routine manually in OpenBot.

## Native Agents And Inbox

Saving a bot creates or updates an app-owned native Twenty Agent using the
existing bot UUID. Its name and active state come from native Agent metadata;
protected application bindings hold execution routing and the optional avatar.
It appears under **Teammates** as **Agent · OpenBot** in the `@` picker. Its chip
opens the native Agent profile, with **External Application** execution details. Select its chip, enter a request and send. The app delivers
`crm.inbox.mentioned` to the configured webhook; the signed callback writes the
answer into the same conversation under that bot's name/avatar.
No Twenty model provider is required for an external-only request.

Only the selected message text is shared. Conversation history and attachments
are excluded. Quoted/code-only references and copied plain references do not
select recipients. A message can address up to five external assistants.
Existing human direct messages do not admit bots. Replies do not trigger bots.

Settings changes synchronize immediately. A minute reconciliation repairs
partial failures and changes made through advanced application variables.
Disabled/removed bots leave discovery and cannot receive requests or reply;
renames preserve identity. Re-enrollment with the same ID retains identity.
Uninstalled applications leave the directory. Historical answers retain their
saved author name/avatar.

The host owns request grants, source-member access checks, expiry and atomic
reply insertion. OpenBot owns credentials and webhook retries. Grants contain a
source-text digest; native requests do not create public Bot Request receipts.
The host rechecks the source and its permissions on each request read/reply.
Normal task/record notifications use the same bot identity in Inbox.

The repository SDK exports `registerExternalAssistant`,
`listOwnExternalAssistants`, `getExternalAssistantRequest` and
`replyToExternalAssistant` from `twenty-sdk/logic-function`. Registration requires
an app-owned logic-function handler and AI permission. The handler receives only
`requestId`, then fetches the authorized request using app identity. OpenBot is
pinned to published SDK 2.59.0, so its adapter calls the equivalent metadata API
until those helpers are published. Installing only the app on an older host is
insufficient; this feature requires the host changes in this branch.

## Run Through The Native Agent API

Use the app’s **Run OpenBot Agent** workflow action with an enabled bot’s ID and
a text prompt. It calls native `runAgent()` with the initiating member’s context;
the action returns its thread ID, run ID and `RUNNING` status. It does not hold
the workflow open for a potentially long external routine. The signed callback
completes the native run and saves the result in that conversation. Direct
`runAgent()` callers can choose `waitForCompletion: true`. The native
in-request workflow Agent runner also supports member-scoped text execution.
Normal app updates preserve enrolled Agents; uninstall removes their app-owned
metadata. Existing IDs and legacy mention tokens remain compatible.

These external Agents use the reserved `external-application` model ID to select
the app runtime. Twenty does not invoke a model, execute native prompts/skills,
or charge native tokens for them. Configure instructions and tools in OpenBot.
Text requests and replies are supported; attachments and structured JSON output
are rejected. App-only/API-key-only execution and background native model-runner
paths fail explicitly because this adapter requires a workspace member. For
scheduled Task reminders, use the existing app actions and reminder workflow
below. An in-request wait that expires can still receive the eventual callback;
use `runAgent()` when a caller needs the normal asynchronous run status.

## Assign Tasks And Set Reminders

A saved Task's native **Assignee** picker includes a **Bots** section. Select multiple
bots alongside its existing human assignee. Bot profiles are read without
returning webhook URLs or secrets, and native Task permissions govern assignment
writes.

The app stores bot UUIDs in the app-owned `task.botAssignees` JSON field. A
focused CRM picker/display adapter exposes them in Assignee, including tasks
without a human assignee. Twenty generates a raw Bot Assignees field in default
views; a workspace admin may hide that storage field through native layout/view
settings while retaining the integrated picker. The app cannot edit standard
view visibility through its own application token. The standard `assigneeId` relationship remains the
human assignment: existing “Assigned to Me” filters and automations retain their
human meaning. API integrations and custom automation use `openBotAssignees` for
bots. Its raw storage column is hidden in the standard task views.

Per-bot settings support these signed events:

| Setting           | Event               | Behavior                                                             |
| ----------------- | ------------------- | -------------------------------------------------------------------- |
| When Assigned     | `crm.task.assigned` | Once per assignment, including newly created tasks                   |
| Before Due        | `crm.task.due_soon` | One warning within the configured advance window                     |
| When Due          | `crm.task.due`      | Once when the current due time is reached                            |
| Overdue Reminders | `crm.task.overdue`  | First reminder after a full interval, then at most once per interval |

Task creation/updates schedule the next notification with Twenty's delayed jobs.
Each job reads the latest task and policy before sending and schedules the next
boundary. A minute-based scan reconciles assignments and settings changes in
pages of 100 tasks, retaining its cursor between runs. Queue availability and
scan size can affect timing; missed overdue intervals produce the current
reminder rather than a burst of catch-up events.

Completion, unassignment, deletion, disabling a bot or changing the due date
cancels stale events before delivery or reply. A request already accepted by
OpenBot cannot be recalled by this app. Automatic notifications create an OpenBot-owned request with the task title,
description and due time. Replies notify the saved human assignee/creator when
available. When Comments is installed, its optional adapter displays these
request threads alongside ordinary comments.
A bot reply does not change Task status; completing the Task stops reminders.

## Workflow Actions

**Send to OpenBot** takes `agentId`, `objectName`, `recordId` and `prompt` and
returns `requestId`, `commentId` and `pending`. It requires a member execution
context and validates the target record through the delegated CRM token.
It works without Comments installed.

**Get Request Status** checks the source record's permissions and returns
`pending`, `accepted`, `retrying`, `failed` or `replied`, plus an answer when
available. Sending does not wait for completion. Add a delay before polling,
and branch on `failed` to notify a person or stop the workflow.

**Send Overdue Task Reminders to Bots** accepts `enabled` and `intervalMinutes`.
It checks currently assigned bots and unfinished overdue tasks, deduplicates
notifications within that interval, and returns queued/scanned counts. Those
counts describe dispatch, not completed bot work. Interactive execution requires
Apps permission; the scheduled workflow runs with the app's identity.

The app includes **Overdue Bot Reminders (Enable Sending to Start)** in native
Workflows: a minute-based timer with this action and a 60-minute overdue
interval. **Sending is disabled in its action input**, so installation does not
send requests. Duplicate the app-managed starter, choose an interval, set
`enabled` to `true`, and publish the copy. The timer checks eligibility; the
interval controls how often each overdue task is pinged. Use this workflow or
the per-bot overdue policy to avoid overlapping policies.

## Routine Payload And Signatures

Configure a routine to accept the events it needs, or all events. Mentions use
`crm.comment.mentioned`; native Inbox mentions use `crm.inbox.mentioned`; task notifications use the event names above. Each
request includes `data.agentId`, `text`, source record/thread IDs, `deliveryId`
and `reply: { url, code }` (plus the legacy `secret` alias). Task events also include `data.taskEvent`, with
its task ID, due date, event type and reminder cycle. Bot routines receive no
general CRM API key.

Outgoing headers are `X-OpenBot-Timestamp`, `X-OpenBot-Delivery-Id` and
`X-OpenBot-Signature: sha256=<hex>`. Sign the exact UTF-8 body as
`HMAC-SHA256(webhookSecret, timestamp + '.' + deliveryId + '.' + body)`.
The recipient should deduplicate side effects by delivery ID: network retries
can repeat an accepted request.

Use `data.reply.code` to sign the answer. This is the same seven-day,
request-scoped signing key formerly named `data.reply.secret`; it grants no
general CRM access. The `secret` alias remains for existing routines. New
instructions should read `code`, since OpenBot's name-based redactor masks the
`secret` field. This deliberately makes the scoped reply credential readable to
the receiving agent. The workspace/routine signing secret stays private.

The `code` field was checked against OpenBot's actual `redactSecrets` function
in the inspected source snapshot. Other versions or a key separately registered
with its redactor can behave differently; this is not a change to OpenBot's
redaction policy. New requests carry the new field; old saved events are not
rewritten. No reply-helper installation is required for this payload format if
the routine can run the signing code below and reach the callback endpoint.

```js
import { createHmac } from 'node:crypto';

const body = JSON.stringify({
  deliveryId: event.data.deliveryId,
  text: finalAnswer,
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac('sha256', event.data.reply.code)
  .update(`${timestamp}.${body}`)
  .digest('hex');
await fetch(event.data.reply.url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-OpenBot-Timestamp': timestamp,
    'X-OpenBot-Signature': `sha256=${signature}`,
  },
  body,
});
```

A webhook acknowledgment alone does not create a CRM reply. Replies accept up to
10,000 characters, require a timestamp within five minutes, and expire after
seven days. Retry with the same delivery ID and answer, plus a fresh timestamp
and signature. Successful saves return 200; invalid signatures return 401;
unknown/expired requests return 404; closed threads, stale task events and
conflicting answers return 409. Overdue replies must arrive before that reminder
interval ends. Deterministic reply IDs and Inbox idempotency keys suppress
callback duplicates. Bot replies cannot trigger other bots.

The [trusted reply helper](../../tools/send-twenty-reply.mjs) remains an optional
alternative for hosts that keep reply credentials outside model context. It
accepts `deliveryId` and `text` on stdin and uses protected environment variables
`OPENBOT_WEBHOOK_SECRET`, `TWENTY_WORKSPACE_ID` and `TWENTY_REPLY_URL`. This app
does not install tools or change routines on the OpenBot host.

## Delivery Failures

Refresh Comments to see delivery status and replies. “Sent to OpenBot” means the
webhook returned 200/202, not that a routine finished; a paused or filtered
routine can acknowledge an event without executing it. Unavailable endpoints
retry up to ten times with the same delivery ID. A closed/deleted source thread
is skipped. Saving a comment is retained if enqueueing fails, with a visible
warning. Task notification enqueue failures can be retried by reconciliation
using the same comment and job IDs.

## Ownership And Optional Integrations

OpenBot owns the supplied logo, settings, encrypted credentials, native Bots
object, Bot Request receipt index, webhook delivery, callbacks and task policies.
The Bots object holds compatible public bot profiles and a native Provider Select;
the canonical execution identity is the app-owned native Agent. Only the
OpenBot provider is implemented; `providers/registry.ts` defines the extension
boundary for a future adapter such as Grok. Bots have no passwords or login
sessions and do not impersonate workspace members.

Request sources, reply bodies and delivery state stay in OpenBot's private KV.
For record/task requests, Bot Request records contain opaque IDs and scope hashes, with HMAC reply claims
for concurrency, rather than request text or credentials. Record access is
checked before the integration returns private content. The request index is
readable metadata, so it is not a private audit log.

Comments owns ordinary human comments and their mention validation. Its adapter
uses OpenBot's authenticated `/s/openbot/bridge` route, with the native route
runtime preserving the member context. App metadata APIs deliberately isolate
applications; no cross-app metadata execution or shared credentials are needed.
The bridge requires a member, validates the target as that member, and queues
only a persisted comment authored by that member. It takes the text and selected
recipients from storage. Missing OpenBot leaves ordinary Comments available.

Uninstalling OpenBot removes its app-owned metadata; it does not own the Comments
object or human login accounts. Disable a bot before disconnecting its routine.
The preview ownership migration preserves old native BOT comment history and
Task assignments; old private delivery jobs are not transferred between apps.

## Preview Boundary

The VM preserves saved connections, including owner-configured connections.
Verification targets only a confirmed loopback demo bot; it does not trigger
other configured bots. Server/worker fetch guards alone are not a guarantee
that application subprocesses cannot reach external destinations. No live
OpenBot access, routine changes, paid model calls or production deployment are
part of this work. See the [native Agent handoff](../../../../../../docs/handoffs/2026-11-23-openbot-native-agent-runtime.md)
for the callback edge-gate limitation and verified runtime boundaries.
