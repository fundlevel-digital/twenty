# 0006. Show Each Message Without Repeated Quoted History

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

Native message bodies included quoted replies from earlier emails, making every
message repeat the same conversation chain.

## Exchange

- 2026-11-21 Kareem, excerpt: "I don't like how each message has the full thread in it"
- 2026-11-21 Agent: removed quoted history during normalization/import and refreshed the copied VM bodies.

## Decision

Store each email's authored content without repeating prior quoted history.
Preserve signatures, inline answers and messages consisting entirely of quoted
or forwarded material when removing quotes would erase the whole message.

## Why

A native conversation already contains its individual messages. Repeated quoted
chains make the history harder to read without adding new authored content.

## Consequences

Plain-text fragments are parsed and HTML quote containers skipped before native
ingestion. Existing deduplicated Messages can have their text refreshed during
import. The CommonJS parser version is pinned because newer ESM releases fail
inside the CLI's CommonJS manifest extraction. Attachments are not imported.
The full source body remains in PlusVibe.

## Evidence

- Local commit `75081446c1`.
- The approved three-message preview snapshot changed from lengths 210/1483/2317
  to 209/397/240 characters without copying customer message content into docs.
- Unit coverage checks signatures, wrapped headers, inline HTML answers and
  quote-only forwards. Native conversation panel checked in the real VM.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
