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

### Confirmed Preview Access Failure And Resolution

Kareem confirmed "Preview" and reported "relogging-indoesn't workeither" and
"Like it doesn't fix it" after the new message incorrectly suggested an expired
CRM session. See [decision 0005](../decisions/twitter-analytics/0005-fix-the-protected-preview-path.md).

The root cause is the renderer's host fetch policy: cookies are deliberately
omitted for `/s` routes because function handlers receive request headers.
Conductor requires its access cookie, so the function request receives the
gate's plain-text 401 before reaching Twenty. The earlier local TLS tests
bypassed that gate and did not establish public-preview success. This was not
resolved by refreshing CRM credentials; the earlier generic 401 classification
was misleading.

The isolated preview now has `twitter-preview-gateway`, a supervised container
with restart policy `unless-stopped`, listening on port 3002 and forwarding to
the existing host on port 3000. Conductor's preview port is 3002, with the same
public URL. Four method-restricted aliases under
`/rest/twitter-preview-functions/twitter-analytics/` let the renderer send page
cookies through the gate. Only Authorization, Content-Type, Accept, Origin and
Host are forwarded from these aliases to their original `/s` routes. Cookies
and access-proxy identity headers are excluded from function handlers. The host's
other HTTP routes and upgraded connections continue through the proxy.

Only the ignored preview app copy rewrites settings, backfill, Influencer import
and refresh request paths. Production source paths, backend triggers and app
permissions are unchanged. The maintained operational helper and tests are in
the app's [preview directory](../../packages/twenty-apps/internal/twitter-analytics/preview/README.md).
The app now identifies Conductor's plain-text access denial separately from a
CRM session failure.

Verification on 2026-11-22:

- A TLS browser proxy enforcing a test access cookie reproduced the old path's
  two 401 responses, including the client's unsuccessful CRM-token refresh.
- The same cookie-gated browser loaded the fixed settings and previewed a
  two-record Company backfill with HTTP 200 responses and no page errors.
- A dedicated tab in the owner's existing authenticated Mac browser loaded the
  actual public URL. Gateway diagnostics recorded its settings GET returning
  200 at 16:51:44 UTC, with the access cookie present at the proxy. This check
  did not bypass Conductor's edge or copy/extract cookies or tokens. It verifies
  the public request, not an accessibility inspection of the rendered form.
- Proxy tests verify native bearer forwarding, exclusion of cookies and proxy
  identity headers, route and method restrictions, and upgraded connections.
  The app has 135 passing unit tests; typecheck and lint pass. SDK preview
  plan/apply updated three front components with zero destructive operations.
- No production changes, Influencer/Company/Person backfill writes or
  TwitterAPI.io calls occurred during this fix. The browser backfill was a
  preview only.

### Native UI Preference And Relation Controls

On 2026-11-22 Kareem requested that existing native Twenty CRM components always
be used when available, with new/custom UI only for capabilities existing
components cannot support. He explicitly requested saving this as rules/skills.
[Repository decision 0008](../decisions/0008-reuse-native-twenty-ui-components.md)
contains his exact instruction and the implementation scope.

The canonical Ruler source and design guide now explicitly cover SDK app front
components. Ruler regenerated `AGENTS.md` and `CLAUDE.md`. A validated shared
`twenty-native-ui` skill has committed Claude/Pi aliases, while the existing
Claude-only UI design skill is preserved and links to it. The Hindsight service
remains unavailable; these tracked rules, skill and decision provide the durable
repository record.

The app replaces its HTML selects with the published Twenty UI 2.59.0 compound
Select: four controls per Company/Person section, eight in total. Its composition
uses native labels, triggers, values, icons, popups, options and indicators. An
explicit positioned portal container keeps popup coordinates within the embedded
panel. A small compatibility handler supplies the missing `nativeEvent` alias on
keyboard-generated clicks from older hosts; it does not replace the control's
selection or keyboard implementation.

Cookie-gated browser verification passed for option selection, the empty Detect
value, keyboard navigation and Enter selection, mode-specific help, preserved
accessible descriptions and the read-only backfill preview. The popup's left
edge and width matched its trigger, and there were no page errors. Typechecking,
oxlint, skill validation and SDK build/plan/apply passed. Metadata plans updated
one front component with no destructive actions. Preview preferences were not
saved or changed, and no source records, memberships or analytics were written.
Production is unchanged.

Kareem also asked whether Keep Existing Relations still relates the new X link.
Confirmed from the existing logic: with saved Create Missing Profiles and Relate
preferences, a record update reuses or creates the new profile and adds its
membership while preserving old memberships. Relate Existing Profiles Only skips
missing profiles; Off disables automatic processing. This behavior was explained
and not changed by the UI work.

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


## Configurable Refresh And Enrollment: Preview Only

Kareem requested configurable timing, a command and workflow for immediate
refreshes, and a profile attribute for scheduled enrollment. See
[decision 0006](../decisions/twitter-analytics/0006-configurable-refresh-and-profile-enrollment.md).
These changes extend draft [PR #26](https://github.com/fundlevel-digital/twenty/pull/26)
on `conductor/untitled-v5`; they are installed on preview, not merged or live.

- App Preferences → TwitterAPI.io → Analytics now offers Off, Hourly, Daily and
  Weekly schedules, with native Twenty Select controls for UTC time and weekday.
  Daily 05:00 UTC remains the default. Saving temporarily disables scheduling,
  saves all preferences and then enables the chosen frequency; partial failures
  report that scheduling may remain off.
- The existing `calculationsEnabled` boolean keeps its identifier, values and
  defaults. Its label is **Scheduled Calculations** and it is visible in the
  app's default profile view. Imported/automatic profiles remain disenrolled;
  manually created profiles retain their existing default enrollment.
- **Refresh Profile and Analytics** remains the selected-record command.
  **Refresh Twitter Profile and Analytics** is a new active single-record native
  workflow and reusable workflow action accepting a Twitter Profile ID. Both
  bypass scheduling and enrollment and reuse the existing refresh and key pool.
  Unsuccessful refreshes fail the workflow step.
- The source cron dispatches each minute, determines the latest configured UTC
  window, and records an attempted window before API work. Initial configuration
  avoids retroactive refreshes; a changed schedule clears its cursor. Ordinary
  later ticks skip a claimed window. Claims are not an atomic distributed lock;
  a failed claimed refresh waits for the next window or an explicit manual retry.
  Already-running work can finish after scheduling/enrollment changes.
- SDK plan: ten creates, four updates, no deletes or destructive operations.
  Native preview apply succeeded. The preview copy deliberately omits cron,
  preserving protected-route aliases and its avatar upload adaptation.
- Native function execution verifies Off skips, initialization saves a window,
  and repeated execution reads that saved marker and skips. Enrollment filtering
  reflects on/off changes to the same field. A manual refresh selected exactly
  one disenrolled temporary profile and used zero provider requests.
- The native core workflow is active and was executed with the same temporary
  profile. Its missing-identity failure is expected: it proves the selected ID
  reaches the refresh step and propagates the refresh error, without paid calls.
  Unit tests cover successful workflow results. Temporary data was removed and
  original preferences and the schedule cursor were restored.
- Browser verification exercised Off/Hourly/Weekly conditional fields, saved
  Thursday 13:17 UTC, reloaded and confirmed saved values in both UI and native
  metadata. The profile table and record detail both show Scheduled Calculations.
  All controls have helper descriptions; no browser errors occurred.
  Screenshot: `.context/twitter-refresh-schedule-verified.png`. This test used
  the exact public origin through local TLS and a simulated access gate; it did
  not traverse Conductor's authenticated public edge. The published host UI
  serves the app; no host frontend source changes are claimed.

Validation: 160 unit tests across 19 files, two preview proxy tests, direct
TypeScript checking, oxlint and the SDK preview build/install. No TwitterAPI.io
requests or production changes were made for this follow-up. Preview settings
are available at https://fundlevel-w930.conductor.show/settings/app-preferences;
its containers restart within the running VM, not across VM destruction.
Hindsight remains unavailable because workspace repo/private-profile metadata
is missing; these verified findings are retained in tracked documentation.

### Main Branch Integration

On 2026-11-22 Kareem requested: "Merge the remote branch (main) into your branch and resolve conflicts. Then, commit and push your changes."
Integrated `origin/main` at `ea0a75d756` into `conductor/untitled-v5`.
The conflicts were limited to the Ruler source, generated agent instructions and
root decision index. Resolution preserves both the app-only boundary from main
and this branch's native Twenty UI rule; Ruler regenerated AGENTS.md and
CLAUDE.md. Main's existing decision 0007 remains unchanged, and this branch's
native UI decision moves to 0008 with all references updated to avoid the
number collision. Twitter app source merged without conflicts.

Post-merge verification: 160 app unit tests, two preview proxy tests, direct
TypeScript checking and oxlint pass. This is repository integration only; no
preview reinstall, paid API calls or production deployment occurred.
