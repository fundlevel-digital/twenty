# 0008. Native External Assistants

- Date: 2026-11-23
- Status: superseded in identity storage by [0011](0011-native-agent-identities-and-execution.md)
- Decided by: Kareem
- Area: OpenBot
- Related: [0007](0007-standalone-app-and-shared-bot-identities.md)

## Exchange

Kareem supplied a native Inbox mention-picker screenshot and asked: "Oh wait, look at how this AI bot is shwoing up as a Assitant, can we tie into that?"

Agent explained that Ada has a special workspace-assistant identity, proposed shared external assistant registration, native mentions and attributed webhook replies, and identified the required host/engine extension. OpenBot would remain a separate app and retain settings, credentials and delivery; Task assignment would retain its adapter.

Kareem: "yeah go for it"

## Decision

Implement the shared native external-assistant capability and the OpenBot app
adapter. Apps manage only their own public identities and handlers. Native
member/thread access checks precede delivery; callbacks require an app-owned
request grant and cannot select arbitrary conversations or senders. Existing Ada
routing remains available. External requests use no native model call.

The live OpenBot remains untouched. Verification uses only the isolated VM and
local fake bot, with manually configured webhook routines.

## State

Implemented in the standalone app and shared host source. Isolated API
verification covers native replies, lifecycle synchronization, ownership,
retry/conflict handling and notification attribution. See the
[verification handoff](../../handoffs/2026-11-23-openbot-native-assistants.md) for
checks and limits. No production deployment or live OpenBot changes occurred.
