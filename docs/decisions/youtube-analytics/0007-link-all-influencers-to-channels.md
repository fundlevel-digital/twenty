# 0007. Move Influencer YouTube Details And Analytics To Channels

- Date: 2026-11-22
- Status: superseded by 0008
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Channel object](0002-one-youtube-channels-object.md), [Initial migration](0005-production-migration-and-verification.md)

## Context

YouTube Channels already contains 90 refreshed records, while 479 Influencers
hold additional YouTube identities and profile details. Legacy analytics entries
also retain metrics and CPM values.

## Exchange

- 2026-11-22 Kareem:

  > Let's just start like this:
  >
  > 1) Take every influencer record, and create a YouTUbe Channel object for them
  > 2) Create a many-to-one relationship from YT Channels, to Influncers
  > 3) Delete any youtube attributes on influencers that aren't already on the YouTube Channels objects

- 2026-11-22 Agent: proposed reusing matching channels, preserving channel data before removing source fields.
- 2026-11-22 Kareem: "Oh, can we please move the analhytics to the YOuTube Channels object"
- 2026-11-22 Kareem: "Also, let's move tthe oyutube pricing to the youtube channels as well"
- 2026-11-22 Kareem: "Actually hold on on the pricing please"
- 2026-11-22 Agent: confirmed pricing stays on Influencers; channel CPM formulas can reference that pricing through the new relationship.

## Decision

Give every Influencer a YouTube Channel, reusing existing matches. Each channel
has one optional Influencer parent; an Influencer can have multiple channels.
Move YouTube identity/profile details and analytics onto channels. Leave YouTube
pricing on Influencers following the owner's correction. Remove migrated
non-pricing YouTube fields from Influencers after verification.

## Why

The owner explicitly requested the channel relationship and analytics move,
then held the pricing move. Reusing the 90 existing channels preserves their
fresh calculations, avatars and native app ownership.

## Consequences

The reviewed migration matches all 90 channels uniquely and creates the remaining
389. New records start with scheduled calculations disabled; this is the agent's
operational choice to preserve the existing refresh population during a data move.
Pricing-dependent CPM formulas on channels continue referencing Influencer costs.
The legacy analytics entries remain available as historical source records.

## Evidence

- Read-only production core/metadata API audit on 2026-11-22: 479 Influencers,
  90 legacy analytics entries, 90 YouTube Channels; no orphan legacy entries,
  duplicate channel identities, ambiguous matches or shared matches.
- Operational commands use the authenticated `fundlevel` Twenty CLI remote on
  the owner's Mac. Private audit and verification artifacts stay outside Git.
- Production execution completed: 389 channels created, 90 reused, 479 verified
  parent links, seven source fields deleted, pricing unchanged and 216 populated
  live CPM results independently checked. The existing 90-channel scheduled
  refresh population remains unchanged.
- [Execution and verification handoff](../../handoffs/2026-11-22-influencer-youtube-channels.md).
