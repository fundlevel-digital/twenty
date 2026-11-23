# 0003. Show Contact And Creator Follow-Up Counts

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Cold And Ghosted Workflows](0002-cold-and-ghosted-workflows.md)

## Context

Ghosted outreach can involve the previously responsive person and additional
POCs. The agent illustrated three unanswered follow-ups to the creator across
two sending inboxes, plus two unanswered messages to their manager.

## Exchange

- 2026-11-23 Agent: "In that example, would you expect the main follow-up count to say 3 or 5—or would you want both visible?"
- 2026-11-23 Kareem: "I think both, but I'm not sure what the best way to display it would be"

## Decision

Show both the unanswered follow-up count for the previously responsive person
and the wider unanswered outreach count across the creator's POCs. Display
design remains open.

## Why

Kareem wants both scopes visible. The agent's rationale is that the first helps
assess the stalled conversation, while the second shows wider outreach effort.

## Consequences

This resolves whether both scopes are wanted in the earlier record's open
counting question. Time windows, reply reset behavior, channel aggregation and
handling multiple previously responsive people still need definition.

Agent display proposal, not an owner-approved layout: show two separately
labeled counts together on the creator row and expose a POC breakdown on
expansion. The broader count includes the contact-specific count; they must
not be added together.

No UI, calculated field, live data or dashboard configuration was changed.

## Evidence

Source: the example in this conversation and Kareem's attached
`chat-reply-2026-11-23_08-42-19.txt`, read on 2026-11-23.
