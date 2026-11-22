# 0005. Preserve Profile JSON And Native Creator Avatars

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer

## Exchange

- Kareem: "I'd like to store the other links & enrichment results as raaw json on the creators btw plz"
- Kareem: "Also I'd prefer to keep Nano Creators unqiue by something and then they have just have mutple memberships or tvr"
- Kareem: "WOuld also be nice to have the raw nano profile reuslts in a raw json field"
- Kareem: "Also would be nice to have avatar images on the creators"
- Kareem: "I belive nano also returns like that last 10 videos and some other analytics?"
- Agent: verified full profile responses contain recent-post/video arrays and analytics; their lengths vary. The existing platform/Nano-ID creator uniqueness and per-list membership model remain in place.

## Decision

Retain raw Nano profile/enrichment/link data on creators, use native Twenty
avatar files, and keep one creator identity with multiple list memberships.

## Implementation And Evidence

`rawNanoListData`, `rawNanoProfile`, `enrichmentResults` and `relatedLinks` are
Raw JSON fields. Profile and list snapshots are separate: list refreshes do not
erase the richer profile response. Known email values are normalized for display;
original Nano payloads retain the unmodified source entries and unknown fields.
One live profile verification retained video arrays and analytics in JSON.
Existing matched emails are imported; paid contact matching remains unimplemented.

The avatar is a Files field and the object's image identifier. Queued imports
bound a real downloaded image to the native field, and browser verification
confirmed loaded image dimensions. Nano's image CDN required a public referrer
and served JPEG bytes with a binary MIME type; bounded downloads now recognize
supported image signatures in that case. Auth cookies are not sent to the CDN.

These changes are implemented in source and installed in the isolated VM.
They are not a production deployment. Verification and limits are in the
[handoff](../../handoffs/2026-11-22-nano-influencer-preview.md).
