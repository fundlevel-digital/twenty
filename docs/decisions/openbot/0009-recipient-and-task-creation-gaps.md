# 0009. Complete Bot Selection And Correct Reply Setup

- Date: 2026-11-23
- Status: superseded in default reply setup by [0010](0010-readable-request-reply-code.md)
- Decided by: Kareem
- Area: OpenBot
- Related: [Native Assistants](0008-native-external-assistants.md)

## Exchange

Kareem reported: "My openbot seemed to have gotten the message, but replying seem's to be broken" and supplied the bot's explanation that the saved event hides its reply key.

Kareem: "one thing here, my bot isn't showing up in the \"Add people or channel\" thing, but it is in the text area"

Kareem: "Seem's I'm not able to assing tasks to bots?"

Asked whether the screenshots were from the preview or deployed CRM, Kareem answered: "VM preview (w928)".

## Findings And Implementation

The native recipient picker had no external-assistant results. It now searches
registered identities, displays removable recipient chips and includes selected
identities in explicit delivery, including a message without a body mention.
A conversation with an external assistant is not converted into a human DM.

The Create Task form uses a different relation picker from saved records. Its
Assignee picker now includes controlled bot selections in the draft, preserving
the human assignee. Selections write through normal create/update permissions
when the user submits; selecting a bot does not create or update a Task early.

The earlier reply instructions assumed the agent could read a callback secret
from its event. The fake-bot integration test signed callbacks in trusted code,
so it did not validate that assumption against OpenBot's model-facing redaction.
The owner reports outbound delivery from the preview; a server/worker-only
fetch preload does not prove application runtimes cannot send externally.
No live OpenBot access or changes are authorized by this correction.

A standalone trusted signing helper is supplied with the app source. It takes
only a delivery ID and answer, uses host-provisioned configuration for the
webhook secret/workspace/callback destination, and derives the scoped signature
without requiring the redacted event secret. It must be installed/configured as
a trusted command/tool on the OpenBot host by its administrator. It has not been
installed into the owner's OpenBot. The preview callback's external reachability
and Conductor gate are separate requirements, not solved by signing.

## Evidence

See [the handoff](../../handoffs/2026-11-23-openbot-selection-and-reply-compatibility.md)
for checks and operational limitations. Source work and isolated checks do not
constitute a production rollout or a verified live OpenBot reply.
