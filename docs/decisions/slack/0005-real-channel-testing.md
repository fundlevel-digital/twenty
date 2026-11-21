# 0005. Use the actual posthog channel for testing

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "Can u acc sync my #posthog channel and use that for testing"
- 2026-11-21 Agent: Read the authorized connected Slack channel and recent thread replies, then imported a private snapshot into the local preview.

## Decision

Use actual channel data to test the conversation model and presentation.

## Why

The owner requested realistic Slack data instead of relying only on synthetic conversations.

## Consequences

Imported 77 distinct messages into 14 conversations: five multi-message threads and nine standalone posts. Thread broadcasts were deduplicated. Real-data test records are separate from synthetic records. This import is a snapshot; it does not provide native OAuth or continuous sync.

## Evidence

Private verification artifacts are gitignored under .context/posthog-import. Bodies, timestamps, relations, duplicate replay and non-owner visibility were verified. No customer message bodies, contact identifiers or credentials are copied into these records.
