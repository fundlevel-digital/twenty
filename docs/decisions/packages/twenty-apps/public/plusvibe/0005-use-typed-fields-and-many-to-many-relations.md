# 0005. Use Typed Fields and Related Senders and Threads

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

The app exposed plain-text statuses/labels and repeated raw source IDs where
relations could provide both navigation and grouping. Source threads can contain
multiple Leads, Senders and native conversations.

## Exchange

- 2026-11-21 Kareem, excerpt: "status should be a select, workspace should be a relation (one workspace, many compaigns)"
- 2026-11-21 Kareem, excerpt: "need to be able to group by thread id"
- 2026-11-21 Kareem, later excerpts: "Threads should be M2M to leads and threads"; "Also, no need to store raw thread id, workspace id if relations are in place"
- 2026-11-21 Kareem, excerpt: "Senders should be obbjects too, and related; multiple senders can be in threads, and same w/ leads"
- 2026-11-21 Agent: interpreted the second "threads" as native Message Threads, asked for clarification, and proceeded with that explicit assumption when no answer was recorded.

## Decision

Use select fields for Campaign Status and Lead Label, a Workspace relation for
Campaigns, and source Thread relations for native message grouping. Model
Senders as records. Represent many-to-many associations among source Threads,
Leads, native Message Threads and Senders. Remove redundant raw IDs from records
that already have the corresponding relation.

## Why

The owner wanted normal Twenty filtering, grouping and navigable source
context. A single Person, Sender or source Thread field on a conversation cannot
represent the requested cardinality.

## Consequences

Six junction objects implement the many-to-many associations because Twenty's
field model supports one-to-many/many-to-one, not a native many-to-many field.
Lookup columns traverse the junctions to show related names. Native Messages
retain a PlusVibe Thread relation for Group by. Canonical provider IDs remain
once on their source Workspace/Campaign/Lead/Thread objects for sync identity.

The exact intended second endpoint of "threads" remains an interpretation,
not a recorded confirmation from Kareem. Changing that interpretation requires
a new decision and migration rather than silently rewriting this record.
Production pruning/backfill is still pending under record 0001.

## Evidence

- Local commits `2bbdb9bec0` and `75081446c1`.
- VM schema plan/apply accepted the definitions and lookup paths.
- Unit coverage verifies multiple Leads/Senders/conversations and idempotent
  junction identities; browser checks verified source Thread lookup columns.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
