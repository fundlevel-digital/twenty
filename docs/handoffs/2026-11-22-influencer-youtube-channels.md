# Influencer YouTube Channel Migration

Completed against the live `fundlevel` CRM through authenticated core and metadata
APIs on 2026-11-22. This was a workspace data/schema operation; no server image
or native app release was deployed. Repository documentation and the operational
script are local workspace changes, not yet committed or merged.

## Result

- All 479 Influencers have a YouTube Channel: 90 existing channels reused,
  389 created. Existing channel IDs, populated values and native avatars remain.
- YouTube Channels → Influencer is nullable many-to-one with `SET_NULL` deletion
  behavior. Influencers → YouTube Channels is one-to-many. The relationship does
  not constrain future Influencers to one channel.
- Channel identity, subscribers, avatar URLs, description and existing analytics
  text moved to channels. Existing populated channel values take precedence over
  older Influencer or legacy-entry values.
- The 90 legacy analytics entries were reconciled into channels. Missing legacy
  CPM snapshot fields and four live CPM formulas were added as workspace-owned
  extensions. Those formulas use channel views and related Influencer pricing.
- Seven non-pricing fields were removed from Influencers after verification:
  `youtubeId`, `youtubeHandle`, `youtubeUrl`, `youtubeSubscriberCount`,
  `youtubeAvatarUrl`, `youtubeDescription`, `youtubeAnalytics`.
- `youtubeVideoDedicationCost` and `youtubeVideoIntegrationCost` remain on
  Influencers, unchanged, following Kareem's correction. No cost fields were
  created on channels.

## Verification

Before migration, API reads found 479 Influencers, 90 legacy analytics entries
and 90 channels. All 90 existing channels matched uniquely. No orphan legacy
entries, duplicate identities, ambiguous matches or shared channel matches were
found.

Verification before and after source-field deletion checked every planned write,
all populated pre-existing channel values, all parent links and both pricing
values for every Influencer. Final counts were 479 Influencers and 479 linked
channels, with zero missing channels. Metadata confirmed both relationship
directions and found no computed-field dependencies on the seven removed fields.
Independent final API checks confirmed that only the two YouTube cost attributes
and the new reverse channel relation remain on Influencers. All 216 populated
live CPM results matched the pricing/view formulas to the displayed precision.

The scheduled refresh population remains 90 enabled channels. All 389 additional
channels start with calculations disabled, including records without a usable
YouTube identity. This operation made no Google requests and used no YouTube
quota. Native avatar files on the original 90 channels remain unchanged; new
records received available avatar URLs, without an external image-import batch.

The 90 legacy analytics entries remain unchanged as historical source records;
their object was not deleted. No browser/UI verification was performed. The API
checks establish data and schema state, not a screenshot of the resulting UI.

## Operational Source And Recovery

- [Decision and exact owner corrections](../decisions/youtube-analytics/0007-link-all-influencers-to-channels.md).
- [Operational script](../../packages/twenty-apps/internal/youtube-analytics/operations/migrate-influencer-youtube-channels.mjs)
  and [usage](../../packages/twenty-apps/internal/youtube-analytics/operations/README.md).

The operation used the owner's existing CLI authentication on the Mac through
Conductor's local-command tool. An expired access token was renewed through the
normal Twenty CLI. No credential values were printed, copied to this VM or
committed. Private migration artifacts are in the operation's configured state
directory on the Mac; they contain CRM records and must remain outside Git.

The first foreground apply reached the local-command time limit after 40 record
writes. It was resumed using deterministic IDs and fresh reads, with four
independent requests in flight and progress logging in a detached Node process.
The original pre-write baseline and 479-record plan were preserved. The resumed
apply completed all records, and subsequent verification passed. There is no
ongoing migration process.

Hindsight memory was unavailable in this VM because its private profile was
missing. Current source, decision records and production API evidence supplied
the context; no external engineering memory retention is claimed.

## Pricing Copy Continuation

Later on 2026-11-22, Kareem requested: "Oh ok, Yeah just add them to YT too, but
don't remove them from influencers yet". This changes the earlier pricing hold;
the preceding migration outcome describes the state before this follow-up.

Added editable nullable NUMBER fields **YouTube Video Dedication Cost** and
**YouTube Video Integration Cost** to live YouTube Channels. Copied 41 dedication
prices and 95 integration prices across 99 channels. Readback verified both prices
on all 479 channels, unchanged parent links and counts, and unchanged pricing for
all 479 Influencers. A separate verification found zero outstanding copies.

The four existing channel CPM formulas still reference Influencer pricing. Price
edits on the two objects are independent; this was a one-time copy, with no sync
automation or Google requests. The source Influencer fields remain editable and
intact. There was no app/server deployment or browser verification. The code and
documentation remain local, uncommitted workspace changes.

- [Decision 0008](../decisions/youtube-analytics/0008-copy-pricing-to-channels.md).
- [Copy and verification script](../../packages/twenty-apps/internal/youtube-analytics/operations/copy-influencer-youtube-pricing.mjs).
