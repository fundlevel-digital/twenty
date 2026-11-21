# 0012. Keep this branch focused on Slack sync

- Date: 2026-11-20
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

The inherited session had expanded beyond the Slack application. The owner corrected its scope. This historical record was backfilled on 2026-11-21 from the supplied Claude transcript; its Date is the day of the original exchange.

## Exchange

- 2026-11-20 Kareem (2026-11-20T16:26:54.770Z):

  > Bruh, this branch is supposed to be for the Slack Sync app only

- 2026-11-20 Agent: the inherited handoff describes the implementation response; the concrete source and verification are documented separately from the owner’s words.

## Decision

Keep the branch and its task documentation focused on Slack sync.

## Why

The owner explicitly rejected unrelated work on the Slack branch.

## Consequences

The new documentation covers Slack behavior and owner decisions. The shared decision skill and Ruler setup are a separately explicit request from the owner on 2026-11-21, not permission to import unrelated Sunny/mono application or infrastructure changes. Pre-existing unrelated workspace edits are not evidence that they belong in the Slack change.

## Evidence

Supplied concatenated Claude JSONL export, original root user message at `2026-11-20T16:26:54.770Z`; root `handoff.md`, “Agreed decisions”; current source and verification in [the implementation guide](../../slack-sync.md). No Slack message bodies or customer contact records are copied here.
