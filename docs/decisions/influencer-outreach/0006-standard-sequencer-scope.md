# 0006. Automation Means A Standard Email Sequencer

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Automated Outreach](0005-automated-outreach-does-not-need-priority-ranking.md)

## Context

The agent asked whether automation handles the entire contact waterfall or
the messages within an enrolled sequence.

## Exchange

- 2026-11-23 Agent: asked whether automation handles messages within a sequence once someone is enrolled.
- 2026-11-23 Kareem: "Just a normal email sequencer lol;"
- 2026-11-23 Kareem: "Like plusvibe,"
- 2026-11-23 Kareem: "Or we might just setup workflows / sequences in twenty crm or something idk"

## Decision

Treat the described automation as standard email sequence execution for an
enrolled contact. Do not assume automatic movement between POCs or repeated
full waterfall rounds. PlusVibe is an example; Twenty workflows/sequences are
another possibility, not a selected implementation.

## Why

Kareem clarified the scope of automation. The dashboard discussion does not
require selecting or building the eventual sequencing system.

## Consequences

Record 0005's automation-scope question is resolved. Ranking and new workflow
implementation remain deferred. No product capability, live integration,
enrollment or workflow was verified or changed.

Agent proposal for discussion: a Cold dashboard could distinguish Never
Contacted, In Sequence, Ready For Next Contact and Waterfall Exhausted as
operational filters. These are not approved stage names or calculated rules;
reliable sequence and contact evidence would be needed to derive them.

## Evidence

Source: Kareem's attached `chat-reply-2026-11-23_09-58-50.txt`, read in this
conversation on 2026-11-23.
