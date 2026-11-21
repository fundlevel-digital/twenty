# 0004. Group record conversations by channel and soften deleted messages

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "I don't like the way deleted is represented, I'd rather have it like a different colour or something"
- 2026-11-21 Kareem: "I'm also fine w/ making custom Tabs on people, companies, etc. called "Slack" that groups by channel, threads, etc."
- 2026-11-21 Kareem: "What abt when threads/messages are only one msg?"
- 2026-11-21 Agent: Implemented app-owned Slack tabs on People and Companies, collapsible channel groups and native thread side panels; standalone posts show once with a one-message count. Deleted text uses amber and strike-through.

## Decision

Provide channel-grouped Slack context on record pages, handle standalone posts clearly, and use a color treatment for deleted messages.

## Why

The owner wanted to inspect several threads within one channel and across channels on the same record, without an awkward deletion presentation.

## Consequences

Person/Company Slack tabs group by channel ID, not channel name. One-message posts become threads when replies arrive. Authorized deleted bodies remain visible with amber strike-through; internal deleted content is still subject to the existing privacy filter.

## Evidence

front-components/conversations.tsx; load-record-conversations.ts; native ChatThreadMessageGroup.tsx. Person/Company grouping, single-message promotion and light/dark deletion styling were browser-verified. Group summaries refresh manually.
