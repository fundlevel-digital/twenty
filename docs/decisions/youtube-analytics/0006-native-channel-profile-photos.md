# 0006. Use Channel Profile Photos As Native Avatars

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Channel object](0002-one-youtube-channels-object.md), [Deployment](0005-production-migration-and-verification.md)

## Context

The deployed channel object stored identities and analytics but did not display
each channel's profile photo as its native record avatar.

## Exchange

- 2026-11-21 Kareem: "can we please also use the yt channel's PFP as a avatar?"
- 2026-11-21 Agent: found that a TEXT image URL is not sufficient for Twenty's native avatar renderer; it needs a FILES field bound as the object's image identifier.
- 2026-11-21 Agent: implemented native image import, verified the preview, then merged/deployed and refreshed all 90 production channels under the existing rollout authorization.
- 2026-11-21 Kareem: "Okay, merge and deploy to or live instance"
- 2026-11-21 Agent: confirmed PR #5 was already merged and the live app matched it, with zero pending metadata changes.

## Decision

Use the best available YouTube channel thumbnail as the native channel record
avatar. Save it in the app-owned **Avatar** FILES field and bind that field as
the object's image identifier. Remember the successfully imported source in
**Avatar URL** so an unchanged photo reuses its file.

## Why

The owner explicitly requested channel photos. Native file storage makes the
same avatar usable in tables and record pages. Thumbnail data already arrives
in `channels.list` snippets, so this adds no YouTube API requests.

## Consequences

Select the first non-empty high, medium or default thumbnail URL, in that order.
Native file creation, upload and completion precede the record update. The FILES
field uses `universalSettings.maxNumberOfValues = 1`; the app role adds
UPLOAD_FILE. Downloads are bounded to 2 MB, with 10-second request timeouts.

Missing thumbnails or failed imports preserve the previous avatar. An avatar
failure logs a warning and allows analytics updates to finish; inspect warnings
and saved files rather than inferring image success from a Ready calculation.
The source URL is saved only with a completed file so failed imports are retried
on a later refresh. Old metrics remain protected by the normal failure handling.

Preview uploads initially hit Conductor's edge gate. Only the ignored preview
fixture redirected that exact preview-origin upload to the internal VM server.
Production uses normal signed upload URLs; no preview routing entered app source.

## Evidence

- [PR #5](https://github.com/fundlevel-digital/twenty/pull/5), merge commit
  `1dc1d4319a3397b5e34ff866fe2dbf682cdbf43d`.
- Production app hash:
  `0fe99aae1dd1066076eaa9ea6912089209b4233c12868784fe922abb91b51918`.
- [Photo parsing](../../../packages/twenty-apps/internal/youtube-analytics/src/logic-functions/utils/youtube-client.ts), [bounded native upload](../../../packages/twenty-apps/internal/youtube-analytics/src/logic-functions/utils/build-youtube-avatar-update.util.ts) and [object binding](../../../packages/twenty-apps/internal/youtube-analytics/src/objects/youtube-channel.object.ts).
- 142 unit tests, direct TypeScript checks, lint and CLI plan/build checks passed.
  Preview browser checks loaded images in the table and record drawer with zero
  page errors. A production native image returned HTTP 200 with `image/jpeg`.
- Production full run: **2026-11-21 16:14:59.927–16:16:05.442 UTC**. 90 selected,
  90 written, zero calculation failures, unavailable credentials or avatar-import
  warnings; 526 Google requests. Independent reads found 90 enabled / 90 with
  one native avatar file / 90 Ready / 90 fresh timestamps / zero errors. The
  previously imported sample retained its file ID, verifying reuse.
- A subsequent read-only CLI plan matched the merged release and reported zero
  create, update or delete actions.
