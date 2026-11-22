# 0008. Copy Pricing To Channels And Keep Influencer Pricing

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Prior migration and pricing hold](0007-link-all-influencers-to-channels.md)

## Context

The channel migration kept pricing on Influencers after Kareem held the pricing
move. Channel CPM formulas reference those original prices. Kareem then requested
copies of the pricing attributes on channels while retaining the originals.

## Exchange

- 2026-11-22 Kareem: "Where di u store pricing on the YT Channels? I only see CPMs"
- 2026-11-22 Agent: explained that YouTube Video Dedication Cost and YouTube Video Integration Cost remain on Influencers because of the pricing hold; channel CPMs reference those attributes.
- 2026-11-22 Kareem: "Oh ok, Yeah just add them to YT too, but don't remove them from influencers yet"
- 2026-11-22 Agent: proposed copying both current prices to channels while preserving the Influencer fields and values; CPM formulas continue using Influencer pricing for now.

## Decision

Add editable YouTube Video Dedication Cost and YouTube Video Integration Cost
attributes to YouTube Channels, populated from each channel's related Influencer.
Keep both original Influencer fields and their values. This supersedes only the
pricing-placement hold in record 0007; its other migration decisions remain in
effect.

## Why

The owner now wants pricing available on channels and explicitly retains the
originals. Copying the current values fulfills that request without deleting data.

## Consequences

Completed directly in the live CRM through core and metadata APIs. Both new
workspace-owned fields are nullable NUMBER fields, matching the source types and
Title Case labels. Copied 41 dedication prices and 95 integration prices across
99 channels. Fields with no source price remain empty. No price synchronization
automation was introduced, and the existing CPM formulas still reference pricing
on Influencers. No Google requests or app/server deployment were needed.

## Evidence

All 479 channels were read back and their two pricing values compared with the
related Influencer. All Influencer IDs and pricing values were compared with the
pre-write snapshot and remained unchanged; channel counts and parent links also
remained unchanged. A second verification found zero further channel updates
needed. Private snapshots remain outside Git on the owner's Mac.

- [Operational script](../../../packages/twenty-apps/internal/youtube-analytics/operations/copy-influencer-youtube-pricing.mjs).
- [Handoff continuation](../../handoffs/2026-11-22-influencer-youtube-channels.md#pricing-copy-continuation).
- Repository script and documentation are local changes, not yet committed or merged.
