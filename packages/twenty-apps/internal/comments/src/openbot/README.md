# OpenBot In Twenty

This optional integration is bundled with the Comments app. Bots have stable IDs,
profiles, webhook credentials and task notification policies. They are separate
from Twenty login accounts. The CRM does not create or change OpenBot routines.

## Configure Bots

Open **Settings → Apps → Comments → OpenBot**. The directory opens a separate,
reloadable configuration page for each bot.

1. Create and enable a webhook routine manually in OpenBot.
2. Choose **Add Bot**, enter its name, optional HTTPS avatar URL, webhook URL and
   signing secret (at least 32 characters), then save. Twenty generates its UUID.
3. Set **Reply URL** to this CRM's public HTTPS `/s/comments/openbot/reply` URL.
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

## Assign Tasks And Set Reminders

A Task's native **Assignee** picker includes a **Bots** section. Select multiple
bots alongside its existing human assignee. Bot profiles are read without
returning webhook URLs or secrets, and native Task permissions govern assignment
writes.

The app stores bot UUIDs in the app-owned `task.openBotAssignees` JSON field. A
focused CRM picker/display adapter exposes them in Assignee, including tasks
without a human assignee. The standard `assigneeId` relationship remains the
human assignment: existing “Assigned to Me” filters and automations retain their
human meaning. API integrations and custom automation use `openBotAssignees` for
bots. Its raw storage column is hidden in the standard task views.

Per-bot settings support these signed events:

| Setting | Event | Behavior |
| --- | --- | --- |
| When Assigned | `crm.task.assigned` | Once per assignment, including newly created tasks |
| Before Due | `crm.task.due_soon` | One warning within the configured advance window |
| When Due | `crm.task.due` | Once when the current due time is reached |
| Overdue Reminders | `crm.task.overdue` | First reminder after a full interval, then at most once per interval |

Task creation/updates schedule the next notification with Twenty's delayed jobs.
Each job reads the latest task and policy before sending and schedules the next
boundary. A minute-based scan reconciles assignments and settings changes in
pages of 100 tasks, retaining its cursor between runs. Queue availability and
scan size can affect timing; missed overdue intervals produce the current
reminder rather than a burst of catch-up events.

Completion, unassignment, deletion, disabling a bot or changing the due date
cancels stale events before delivery or reply. A request already accepted by
OpenBot cannot be recalled by this app. Automatic notifications create a Task
Comments thread, with the task title, description and due time. Replies appear
under that thread and notify the saved human assignee/creator when available.

## Workflow Actions

**Send to OpenBot** takes `agentId`, `objectName`, `recordId` and `prompt` and
returns `requestId`, `commentId` and `pending`. It requires a member execution
context and validates access through the normal Comments handler.

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
`crm.comment.mentioned`; task notifications use the event names above. Each
request includes `data.agentId`, `text`, source record/thread IDs, `deliveryId`
and `reply: { url, secret }`. Task events also include `data.taskEvent`, with
its task ID, due date, event type and reminder cycle. Bot routines receive no
general CRM API key.

Outgoing headers are `X-OpenBot-Timestamp`, `X-OpenBot-Delivery-Id` and
`X-OpenBot-Signature: sha256=<hex>`. Sign the exact UTF-8 body as
`HMAC-SHA256(webhookSecret, timestamp + '.' + deliveryId + '.' + body)`.
The recipient should deduplicate side effects by delivery ID: network retries
can repeat an accepted request.

Give the routine instructions to complete the requested work and send its final
answer to `data.reply.url` using the task-scoped secret:

```js
import { createHmac } from 'node:crypto';

const body = JSON.stringify({ deliveryId: event.data.deliveryId, text: finalAnswer });
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac('sha256', event.data.reply.secret)
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

## Delivery Failures

Refresh Comments to see delivery status and replies. “Sent to OpenBot” means the
webhook returned 200/202, not that a routine finished; a paused or filtered
routine can acknowledge an event without executing it. Unavailable endpoints
retry up to ten times with the same delivery ID. A closed/deleted source thread
is skipped. Saving a comment is retained if enqueueing fails, with a visible
warning. Task notification enqueue failures can be retried by reconciliation
using the same comment and job IDs.

## Preview Boundary

The isolated VM uses local demo bots and a local HTTPS callback. Its server and
worker reject non-loopback HTTP destinations during verification. No live
OpenBot access, routine changes, paid model calls or production deployment are
part of this work. The maintained verification handoff is
[OpenBot Comments Preview](../../../../../../docs/handoffs/2026-11-22-openbot-comments-preview.md).
