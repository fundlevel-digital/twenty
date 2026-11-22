# OpenBot Participants

The Comments app can mention OpenBot agents and receive their replies in the
originating record thread. These are bot participants with their own stable ID,
name, avatar and Bot badge. They are not Twenty login accounts, task assignees or
record owners.

## Connect A Routine

1. In OpenBot, make an agent routine with **When to Run → Webhook**. Enable it
   and copy its URL and signing secret. Its event type must be
   `crm.comment.mentioned`, or accept all event types.
2. In Twenty, open **Settings → Apps → Comments** and set the application
   variables. `OPENBOT_CONNECTIONS` is encrypted and available only to the app's
   backend. Add a stable UUID for each participant; keep it when renaming a bot.

   ```json
   [
     {
       "id": "11111111-1111-4111-8111-111111111111",
       "name": "Research Bot",
       "avatarUrl": null,
       "webhookUrl": "https://your-openbot-webhook.example/routine",
       "webhookSecret": "your-routine-signing-secret"
     }
   ]
   ```

3. Set `OPENBOT_REPLY_URL` to the public HTTPS URL of this installation's
   `/s/comments/openbot/reply` route. The host and that callback must be reachable
   from each other. An authenticating reverse proxy must allow this signed
   callback route. The Conductor preview's local test agent uses a VM-local HTTPS
   callback; its public edge still requires Conductor sign-in.
4. Give the OpenBot routine an instruction to perform the requested work and
   send its final answer back. The event's `data` contains the comment text,
   source record ID and label, thread ID, requesting member ID, delivery ID,
   and `reply.url` / `reply.secret`. The reply secret is restricted to this task;
   OpenBot never receives a general CRM API key or its webhook signing secret.

An example routine instruction:

> Read the CRM comment in the event as a request from the person who mentioned
> you. Use the record label and IDs as context. Complete the request using only
> your available tools and permissions. Send your final answer to the reply URL
> using the callback format below. Do not claim to have performed an action you
> could not verify. Keep the task's reply secret private.

OpenBot also supports **Use the sender's signing secret**. Twenty can generate
this value and use the same value in `webhookSecret`. Authorized host setup code
can set it with `POST /v1/admin/events/routines/set-secret` and
`Authorization: Bearer <host-session-token>`. This requires an owner/admin
session and the `webhook-sender-secret-v1` capability. Missing/invalid sessions
return 401; insufficient privileges return 403. The Team API is loopback-only,
so this is not an admin endpoint on the public webhook URL. Keep that privileged
session outside model-visible tools. This app does not yet automate enrollment
or call that endpoint.

The OpenBot routine needs an HTTP or terminal tool to send the callback. A
webhook acknowledgment alone does not write a reply to the CRM.

## Callback Format

Send a JSON POST to `data.reply.url`:

```js
import { createHmac } from 'node:crypto';

const body = JSON.stringify({
  deliveryId: event.data.deliveryId,
  text: finalAnswer,
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac('sha256', event.data.reply.secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');
const response = await fetch(event.data.reply.url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-OpenBot-Timestamp': timestamp,
    'X-OpenBot-Signature': `sha256=${signature}`,
  },
  body,
});
```

Use the exact body bytes that were signed. A reply accepts at most 10,000
characters, expires after seven days, and requires a timestamp within five
minutes. Retry a temporary failure with the same delivery ID and answer, plus a
fresh timestamp and signature. A successful callback returns 200. An invalid
signature returns 401; an expired or unknown task returns 404; a closed/deleted
source thread or an attempt to replace a different answer returns 409.

Replies are attributed from saved task metadata and server configuration. The
caller cannot choose another author or record. A deterministic reply UUID and
Inbox idempotency key prevent simultaneous retries from duplicating a reply or
notification. Bot replies contain no actionable mentions and never enqueue
other bots.

## Delivery And User Experience

Type `@` in a comment or use the mention button, then choose the bot. Only a
selected, configured bot mention triggers a routine. Refresh Comments to see
queue status and replies; this app does not use live subscriptions. Status
**Sent to OpenBot** means the host accepted the event, not that the task finished.
A paused routine or a routine with mismatched filters can accept an event
without running, as documented by OpenBot.

The worker retries unavailable hosts with exponential backoff, up to ten
retries, retaining the same OpenBot delivery ID and event body. No call is made
for a comment deleted before delivery or a thread closed before delivery.
Inbox notifications go to the member who requested the work. Replies to an
Inbox notification do not synchronize back to Comments.

This implementation uses OpenBot's existing signed webhook protocol:
[OpenBot webhook documentation](https://github.com/fundlevel-digital/openbot/blob/main/docs/webhooks.md).

## Current Limits

Removing a participant from `OPENBOT_CONNECTIONS` removes it from mention search
and blocks future delivery/replies that require that connection. Existing authored
comments remain. Profile changes require updating the registry; there is no
background enrollment or profile synchronization yet.

Comment saves survive bot delivery failures. Failed enqueueing shows a warning;
network delivery failures retry and expose a delivery status on refresh. There is
no manual Retry action, failure Inbox notification, or accepted-request completion
deadline yet. Seven-day callback expiry is an authorization limit, not a workflow
timeout. The **Send to OpenBot** and **Get Request Status** workflow actions are available.

## Workflow Actions

**Send to OpenBot** takes a configured agent UUID, object name, record UUID and
prompt. It saves a comment mentioning that bot and returns `requestId`, `status`
and `commentId`. It uses the same caller record-access and recipient checks as
Comments. The action requires a workspace-member execution context and fails
explicitly if no member identity is present or enqueueing fails. A saved comment
is retained if enqueueing fails, with its request ID in the error.

**Get Request Status** takes that `requestId`, checks access to its source record,
and returns `pending`, `accepted`, `retrying`, `failed` or `replied`, plus a saved
answer when available. Expired requests return `failed`. Branch a workflow on
this status and use a delay before checking again; sending does not wait for an
answer or report webhook acceptance as completed work.

Kareem will configure webhook routines manually. No connector, automatic routine
provisioning or live OpenBot configuration is part of this implementation.
