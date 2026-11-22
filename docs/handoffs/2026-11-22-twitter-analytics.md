# TwitterAPI.io App And Isolated Preview

Date: 2026-11-22. Implemented in the current workspace; not merged or deployed to
production. See the [owner decision](../decisions/twitter-analytics/0001-native-twitter-profiles-and-preview.md)
and [app README](../../packages/twenty-apps/internal/twitter-analytics/README.md).

## Delivered

- Native TwitterAPI.io SDK app with the provider's favicon as its logo.
- Twitter Profiles with identity, followers/following, native avatars and analytics.
- Influencer Has Many Twitter Profiles / Twitter Profile Belongs to One Influencer.
  The app extends the established custom Influencer object rather than owning it.
- Import Twitter Profiles action on up to 100 selected Influencers. Native Links
  and text Twitter/X fields are discovered; import creates relations without
  external API spending or enabling scheduled refresh. Existing parents remain.
- Native encrypted workspace API-key connections, App Preferences → Analytics,
  validated timeframe tags, separate number/percentage windows, configurable
  recent-post samples and native sortable/filterable metric columns.
- Manual authenticated refresh, daily enabled-profile refresh in source, bounded
  cursor pagination, key rotation, retry handling and per-key 5.1-second pacing
  for the provider's free tier. Failed refreshes retain previous metric values.

## Verified

- 108 unit tests, direct TypeScript typechecking, oxlint and SDK app builds pass.
- Native app plan/apply installed and updated the app in the isolated preview.
  No deletion/pruning was requested.
- Eight neutral demo Influencers imported into eight related Twitter Profiles.
  Rerunning the import returned zero created, zero related, zero skipped. A ninth
  demo profile related to the first Influencer verifies the Has Many relation.
- The supplied key was saved through the native encrypted connection API. It is
  absent from tracked source and documents; the temporary plaintext key file was
  removed after connection creation.
- A live TypeScript profile refresh succeeded with one profile lookup and two
  timeline pages, 12 recent posts analyzed, populated followers/following and
  native metrics, Ready status and a fresh successful timestamp. A second refresh
  verified the native avatar upload/binding; its Files field has one entry.
- Browser checks covered the native table, App Preferences → TwitterAPI.io →
  Analytics, invalid recent count, invalid day tag, save and restore to the default
  recent count of 12. Settings produced no page errors. Screenshots are private
  workspace artifacts under `.context/`.
- Real external requests consumed provider credits. An initial unavailable public
  handle failed safely. A high-volume GitHub timeline scan was stopped before
  completion to bound the preview check, then the lower-volume TypeScript profile
  completed. Account billing totals were not measured. No customer-profile batch
  was run. The supplied key returned the provider's free-tier 429 message; pacing
  was added and the subsequent TypeScript refresh completed in approximately 11 s.

## Preview Runtime

The isolated preview uses the published Twenty host image, compatible with this
SDK app; it does not verify changes to the repository's host frontend. There are
no host frontend source changes in this task. The installed preview fixture under
`.context/twitter-preview/app` omits cron and rewrites only the exact preview
host's signed avatar upload URL to the internal local server. Production source
retains its cron and ordinary signed uploads. The CLI's private fetch adapter
handles the same exact-host upload issue for installing app assets.

Get the protected preview URL with `conductor preview get` (port 3000). The public
edge responds with its expected anonymous 401 sign-in gate. Browser verification
used the same HTTPS origin with VM-only TLS host mapping, so it bypassed that
edge. The owner's authenticated Conductor edge session was not independently
verified. Use the standard seeded development login; no credentials are recorded
here.

Docker containers `twitter-preview-server`, `twitter-preview-worker`,
`twitter-preview-db` and `twitter-preview-redis` use host networking, persistent
volumes and `unless-stopped` restart policies. The server and worker share a local
storage volume. Private runtime environment and CLI/session files are ignored
under `.context/twitter-preview`. The server uses its public origin and a local
`SERVER_INTERNAL_URL` for LOCAL function execution. Cron registration is disabled
in the preview environment. Health succeeds on the local backend.

Restart existing containers after starting the Docker daemon if necessary; do
not reseed or reset the database to restore this preview. No Conductor wake action
was configured, and survival across a VM shutdown is not claimed.

## Limits And Remaining Work

Production Influencer records were not copied. Mac access timed out, and the
preview uses neutral Influencer demo records plus one real public Twitter profile.
The import action is ready for existing Influencer data when installed in the
intended workspace. Production deployment and migration were not performed.

The Hindsight CLI profile is unavailable in this VM (`Missing/invalid repo
metadata or private profile`); both recall and retention were unavailable. The
checked source, decision and this handoff preserve the verified engineering facts.

## Expansion Before Merge And Live Installation

The owner expanded the scope before merge: native Company/Person workflows,
many-to-many profile relations, configurable auto-creation/backfills, response
examples and verified multi-key waterfalling. See [decision 0003](../decisions/twitter-analytics/0003-company-and-person-profile-workflows.md).

Live metadata inspection using the owner's saved Mac CLI remote confirmed both
Companies and People have `pdlTwitterUrl` (Links, X / Twitter) and legacy `twitter`
(Text). Raw CLI core introspection returned only standard fields, so it was not
sufficient evidence that custom X fields were absent. Metadata object filters
support universal identifiers, not names; field filters support object IDs, not
field names. The app source selector uses the compatible metadata queries.

The preview installed two native workflows, two join objects, unique membership
indexes, reverse relations, related-record paths and Profile Relations preferences.
A real native workflow run related the existing public TypeScript profile to two
demo Companies and two demo People. Automatic creation was restored to Off after
verification. Company backfill preview/application and repeat membership checks
use the same settings and make no external API calls. Native creation of join
records required update permission as well as create permission in this host;
only the app-owned join objects receive those additional write permissions.

The provided API key was used for two bounded public TypeScript read requests to
capture raw endpoint examples; its temporary plaintext file was removed. Full
responses remain ignored under `.context/twitter-api-*-response.json`; abridged
public examples are documented in the app's API.md. No customer records or keys
are in those documents.

PR #19 remains the source PR until the expanded version is merged. Live app
installation and the Influencer relation backfill follow the source merge; preview
installation alone is not a production rollout.

Additional workflow verification covered clearing and restoring an X field: the
managed membership is soft-deleted and restored when the same handle returns.
Unique membership indexes include soft-deleted rows, so creating a replacement
row would violate uniqueness; the app restores its own deleted membership and
preserves manually deleted memberships. The host rejects duplicate root resolver
names in one GraphQL operation even with aliases; active/deleted membership reads
therefore use separate operations.

The expanded browser verification saved/restored automatic creation preferences
and completed both preview and application across all 601 preview Companies:
2 existing memberships, no new profiles, no duplicate memberships, no removals
and no browser page errors. Unit coverage now totals 122 passing tests, including
native metadata field discovery, independent many-to-many memberships, managed
membership restoration/manual-deletion preservation and the multi-key waterfall.
