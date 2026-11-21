# 0010. Use per-member Slack user connections and conversation inclusion

- Date: 2026-11-19
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

The owner proposed using the existing internal Slack apps with a user-token connection for each teammate, following LinkedIn, so that member-visible conversations can sync and channels can be included or excluded. This historical record was backfilled on 2026-11-21 from the supplied Claude transcript; its Date is the day of the original exchange.

## Exchange

- 2026-11-19 Kareem (2026-11-19T17:41:34.723Z):

  > I was thinking we could just use our own Slack app i.e. I have a Sunny Ops (sunny workspace) and Fundlevel Ops bot - then maybe we can have a user-token connection w/ every user in the workspace, like how the LI app does it - then every channel that user is in can be synced to the CRM? Also being able to Include/Exclude channels would be rly dope

- 2026-11-19 Agent: the inherited handoff describes the implementation response; the concrete source and verification are documented separately from the owner’s words.

## Decision

Use each member’s Slack user authorization, not a single assistant-bot credential, and support per-conversation inclusion/exclusion. Keep the sync application separate from the upstream Slack assistant.

## Why

The owner’s internal Slack apps and the LinkedIn connection model fit the required per-member access boundary.

## Consequences

Slack Connect folders start enabled; other conversations are opt-in. Credentials are scoped to each installed application/workspace, while user tokens belong to native member connections. Native OAuth remains pending in this VM; connected-tool access is not a substitute.

## Evidence

Supplied concatenated Claude JSONL export, original root user message at `2026-11-19T17:41:34.723Z`; root `handoff.md`, “Agreed decisions”; current source and verification in [the implementation guide](../../slack-sync.md). No Slack message bodies or customer contact records are copied here.
