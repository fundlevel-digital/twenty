# 0005. Preview Native Group Inbox Views

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Google Groups
- Related: [Full-history import](0004-backfill-all-available-group-mail.md), [preview handoff](../../handoffs/2026-11-22-fundlevel-google-groups-preview.md)

## Context

The imported Group emails appeared on related People records, but the preview
had no per-mailbox browsing views. Kareem asked how to browse everything an inbox
received and what the proposed views would look like.

## Exchange

- 2026-11-23 Kareem, attached reply: "What would this look like?"
- 2026-11-23 Agent: proposed a Google Groups sidebar folder with All Group Emails,
  Team Inbox, Ops Inbox and Creators Inbox, using native table views with sender,
  subject, received date and attachments, opening the existing conversation reader.
- 2026-11-23 Kareem: "Hmmm ok; yeah preview that plz"

## Decision

Implement and verify those inbox views in the isolated Fundlevel preview using
its existing imported messages. Keep the actual sender separate from the Group
address. Use one row per conversation with the latest received email's sender
and date, and the received messages' attachment total. Opening the conversation
reveals its full history and native reply controls.

## Consequences

The app adds native conversation summary fields, a generic All Group Emails view
and a sidebar folder. Configured Group shortcuts are generated only in the
ignored preview fixture; workspace addresses are not embedded in tracked source.
The preview's existing records populate the summaries through authenticated APIs.
Future imports maintain them. Sending as a Group does not itself count as mail
received by that Group. No new Gmail import, outbound mail or production action
is required for this preview.

## Evidence

The preview handoff records the reviewed metadata plans, runtime checks, counts,
browser verification, tests and remaining limitations.
