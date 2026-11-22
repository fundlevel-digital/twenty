# TwitterAPI.io App And Isolated Preview

Date: 2026-11-22. Merged in [PR #19](https://github.com/fundlevel-digital/twenty/pull/19)
at commit c0899348c83d013de78db921d1b82e4183e1544e, installed on the live CRM,
and backfilled with 235 related Twitter Profiles. The final production audit is below. See the [owner decision](../decisions/twitter-analytics/0001-native-twitter-profiles-and-preview.md)
and [app README](../../packages/twenty-apps/internal/twitter-analytics/README.md).

## Follow-Up: Preview Only

Kareem corrected the scope on 2026-11-22: the additional workflow scope should
have remained on preview. See [decision 0004](../decisions/twitter-analytics/0004-preview-scope-and-backfill-explanations.md).
The following changes are local to the continuation branch and installed only on
the isolated preview; they are not merged or deployed to production:

- Setting-specific explanations cover automatic modes, relation replacement,
  manual relation preservation, one-time backfills and analytics spending.
  Explanations change with the selected mode and are associated with controls
  through accessible descriptions. Preview counts describe proposed changes;
  completed-run counts describe applied changes.
- Source queries exclude null and empty Text values and empty primary/secondary
  Links values before processing. Secondary-only X links remain eligible.
- Replacement mode adds a separate paginated managed-membership pass for cleared
  X fields. It deduplicates sources within and across pages, preserves manual
  memberships and excludes unrelated empty records. Successful cleanup is not
  counted as skipped. Single-record workflow events still handle cleared fields.
- App unit suite: 127 tests across 14 files pass. Direct TypeScript checking,
  oxlint and SDK preview build/plan/apply pass. Plans contain updates only, with no
  destructive operations.
- Native preview verification selected two populated Companies in one request.
  A secondary-only link and an invalid link were correctly included; unrelated
  blank records were excluded. Replacement preview and apply each found and
  removed 103 stale managed memberships across multiple pages, preserving the
  manual membership and the populated memberships. Temporary test records were
  removed and original preview preferences restored; no TwitterAPI.io calls ran.
- Browser checks verified dynamic descriptions, the two-record preview summary,
  and preview-before-apply gating with no page errors. The browser used the exact
  preview origin through a local TLS proxy, bypassing Conductor's edge. The public
  edge returned its expected anonymous sign-in gate; host frontend source was
  not changed.

Kareem also asked about CRM-wide grouping by the Companies/People relations.
Current record-view grouping permits Select and Many-to-One fields; the shared
grouping guard explicitly excludes One-to-Many fields. The app's Companies and
People relations use join objects. Supporting these groups requires shared
relation-path queries and consistent multi-group record identity, counts,
pagination and drag-and-drop semantics. This was assessed but not implemented.

The Hindsight service was unavailable in this workspace (private profile/repo
metadata missing), so verified findings and the owner correction are retained
in this handoff and decision 0004 instead.

### Profile Relations Loading Failure

On 2026-11-22 Kareem supplied a screenshot showing "Could not load profile
relations. Reload this page to try again." The screenshot omitted its origin.
Read-only diagnostics found the live settings function successful, its HTTP GET
route returning 200 with both source configurations, and the app identification
query successful. The isolated preview route and browser also loaded correctly.
The original failure was not reproduced; a session, permission or temporary
request failure remains possible, not a verified root cause.

The continuation adds an inline **Retry** button and separates settings-request,
app-identification, session and permission messages. Retrying reloads the two
read-only requests without a full page refresh. Responses from earlier attempts
or unmounted components are ignored, and missing response data becomes a
recoverable error instead of a component exception. Raw server errors are not
displayed. The change is installed only in preview; live configuration and
records were not changed.

The unit suite now has 134 passing tests across 15 files, with direct TypeScript
checking and oxlint passing. SDK plan/apply updated one front component with zero
creates, deletes or destructive actions. Browser tests inject a settings 503,
settings 403, expired session, metadata permission error, missing app details and
malformed settings response, then restore the requests and verify recovery with
**Retry**, with no page errors. These use the existing preview host through the
local TLS proxy and do not verify Conductor's public edge. No TwitterAPI.io calls
or backfills are involved.

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

## Initial Preview Verification

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

## Initial Preview Limits

At the initial preview handoff, production Influencer records had not been
copied. Mac access timed out, so that preview used neutral demo records plus one
real public profile. Subsequent owner approval and production rollout are recorded
below; production CRM records were never copied into the isolated preview.

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

PR #19 merged before installation, as requested. The source commit and live
installation are verified separately below.

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


## Final Production Rollout

- Source: [merged PR #19](https://github.com/fundlevel-digital/twenty/pull/19),
  commit c0899348c83d013de78db921d1b82e4183e1544e.
- Installed the exact merged source using CLI 2.59.0, remote fundlevel, and
  app apply --create --no-prune from an isolated Mac worktree. Content hash:
  7186e820623263dbb29f93dfeee089cd80348f86ea8390d7d7a4745d5540cf8d.
- Installation completed all build/registration/installation/upload/sync phases:
  **286 entities created, zero updates, zero deletions, zero destructive actions**.
- Read all **479 Influencers** with cursor pagination and imported their existing
  xUrl values in ten resumable batches. Created **235 Twitter Profiles**, all
  related to an existing Influencer; no duplicate normalized handles.
- The source audit found **214 empty URLs**, **26 invalid URLs** and **239 valid
  account claims representing 235 distinct handles**. The four additional shared
  claims were skipped to preserve the profile's existing Influencer parent and
  the agreed Influencer Has Many model. No parent was silently reassigned.
- All **235 imported profiles have Calculations Enabled off**. No paid Twitter
  batch was run as part of backfilling relations.
- Live Profile Relations exposes the existing PDL X / Twitter and legacy Twitter
  fields for Companies and People. Both automatic modes remain **Off**, relation
  changes default to **Keep Existing Relations**, and their backfills remain
  optional through the preview/run controls.
- Connected the supplied API key through the normal authenticated native CRM
  form. The endpoint rejected CLI OAuth (PERMISSION_DENIED), and browser
  JavaScript automation was unavailable. Existing native accessibility controls
  completed the form; no browser security setting was changed. Temporary key
  transport was encrypted, no key appeared in command arguments/logs, and the
  temporary plaintext/RSA transport files were removed.
- Independent native metadata audit confirms **one usable WORKSPACE connection**
  with no authentication failure or archival flag. An explicit empty-selection
  refresh initialized **36 managed metric columns**. That CLI command timed out
  waiting for its HTTP result; the subsequent metadata audit verified the saved
  connection and all 36 fields. No source profiles were selected for that check.
- Source validation: **122 tests pass**, direct typecheck, lint and SDK build pass.
  Preview browser/workflow checks are described above. Production verification
  used native metadata, authenticated app routes, a native browser connection form
  and source/record audits; no production analytics batch was triggered.

Private progress, record IDs and audit outputs remain only in the isolated Mac
release directory, referenced by the local repository's ignored
.context/twitter-live-w930-release-dir. They are not copied into these docs or
into the cloud preview. The separate preview retains neutral demo records and
its own native connection.
