# 0003. Expose channels, threads, messages and attachments

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "I'd also like a `Slack` folder on the Sidebar, that let's me see Channels, Threads, Slack Messages"
- 2026-11-21 Kareem: "We can also extend the message obj, w/ Slack Message ID, reply data/relations, channel relations, etc."
- 2026-11-21 Kareem: "Also should be able to hold attachements"
- 2026-11-21 Agent: Added a Slack navigation folder, an app-owned Slack Channel object, native message/thread Slack fields, parent/reply links and native file attachments.

## Decision

Provide a Slack sidebar folder with Channels, Threads and Slack Messages. Extend native messages and threads with provider IDs and relations, and support files.

## Why

The owner wanted both structured record browsing and conversation context, with files retained alongside messages.

## Consequences

A standalone post has one native thread record; replies reuse it. Provider identity includes workspace, channel and Slack timestamp. Files use native attachments; inaccessible or unsupported files show an import status.

## Evidence

src/constants/schema-identifiers.ts; Slack object/field/sidebar definitions; map-message.ts; link-slack-replies.ts; import-attachments.ts. Native attachment ingestion and signed download were verified in the preview.
