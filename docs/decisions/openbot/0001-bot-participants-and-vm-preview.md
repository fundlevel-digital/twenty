# 0001. Bot Participants And VM Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [Comments workspace](https://app.conductor.build/fundlevel/w/929)

## Context

Kareem identified `fundlevel-digital/openbot` and asked whether its agents could
participate in the Comments app being built in a separate workspace.

## Exchange

- Kareem: "I'd like to also be able to mention openbot's in here; maybe we can also use openbots as users? Is that possible?"
- Agent: Proposed bot participants with a stable name, avatar, Bot badge,
  authenticated replies, and signed OpenBot routine webhooks. Distinguished
  those participants from ordinary Twenty login accounts and noted that task
  assignment and record ownership would require additional identity design.
- Kareem: "Ok, please build htis and setup a preview on ur VM"

## Decision

Implement OpenBot participants in record comment threads and provide an isolated
preview. Bot mentions trigger an OpenBot routine; an authenticated reply returns
to the same thread under the bot's identity. Ordinary human login accounts,
task assignment and record ownership are outside this implementation.

## Evidence

- OpenBot's `docs/webhooks.md` on its main branch documents signed POST events,
  delivery-ID deduplication, retries and asynchronous acceptance.
- The Comments workspace's current source is initially unpushed. Its transcript
  confirms an installable app with `recordComment` records, user/record mentions,
  replies and Inbox notification delivery. Integration must use its actual source
  when available.
- No production change or real external agent execution is authorized by this
  record. The requested work authorizes an isolated preview and its local test
  agent; connecting a real OpenBot routine requires its private configuration.

## State

Implemented as an extension of the Comments app from commit `46d5685169`.
The isolated VM preview verifies native bot mentions, attributed replies,
Inbox delivery, duplicate callback handling and forged-signature rejection with
a local test bot. Typecheck, build and 41 tests pass. A real OpenBot routine has
not been connected and production has not been changed. See the
[handoff](../../handoffs/2026-11-22-openbot-comments-preview.md).
