# GitHub Profiles — Isolated Preview

[Owner decision](../decisions/github-profiles/0001-native-github-profiles-app-and-preview.md).
[Maintained app documentation](../../packages/twenty-apps/internal/github-profiles/README.md).

## Implemented

The new SDK app owns GitHub Profiles, its native table/navigation, all 13 requested
provider Links fields, structured account fields, original JSON responses and a
Files field used as the native record image. Its reverse field extends the
existing Influencer object with a Has Many relation. Deleting an influencer sets
the profile's relation to null.

Fetch GitHub Profile is available as a workflow action, authenticated HTTP route
and tool. Refresh GitHub Profile is a native record command. The fetch action
creates or updates by immutable GitHub ID and preserves an existing influencer
relation when no new influencer is supplied. It returns the original parsed
profile and social-account payloads, plus the saved record ID.

The app stores GitHub account dates separately from CRM record timestamps. Public
GitHub requests work without a token; an optional app secret supports a higher
limit. No schedule, commit-email extraction or CRM bulk import was added.

## Verification

- App typecheck, lint and eight unit tests pass. The CLI builds and installs the
  app using SDK 2.59.0 and CLI 2.60.0.
- The native fetch route downloaded a public GitHub demo profile and imported its
  avatar. A repeat refresh reused the same record.
- A native workflow with a manual trigger and Fetch GitHub Profile action
  completed successfully, returning both response payloads and the same record ID.
- Readback confirmed exact JSON-value equality for both responses, including the
  empty social array, nullable hireable and false site-admin flag.
- Both influencer relation directions were queried successfully.
- An authenticated browser verified the native GitHub Profiles table and record
  fields, loaded avatar images and no page exceptions on those pages.
- Backend health passed. The Conductor edge returned its expected anonymous
  sign-in gate; authenticated browser checks used local TLS and host mapping for
  the exact preview origin, bypassing that edge.

Twenty's raw JSON input transformer treats an empty array as null. Sending the
social response as serialized JSON avoids that normalization; normal GraphQL
readback and the UI expose the original JSON array. This behavior was checked
against source and the running preview.

## Preview Runtime

This VM runs PostgreSQL 16, Redis 7 and Twenty's bundled server/frontend and queue
worker from the public `twentycrm/twenty:v2.60.3` image. The isolated development
workspace has demo records, a small preview-only Influencer object matching the
existing object's universal identifier, and a public GitHub demo profile related
to a synthetic influencer. No production database or private CRM data was copied.
This validates the SDK app against that host version; it does not validate a new
build of this checkout's Twenty 2.61 host frontend.

The frontend/server is exposed on port 3000 through Conductor. Server, worker,
PostgreSQL and Redis use Docker restart policies and persistent database/storage
volumes. They remain alive after tool calls. The preview depends on this VM;
VM shutdown recovery and a Conductor wake action were not configured or tested.

Private setup files, browser state, TLS material, run results and screenshots are
under `.context/github-preview/` and `.context/`, outside Git. The local TLS proxy
is only for browser verification, not the owner's public preview route.

Conductor's edge blocks server-side signed uploads without a browser session.
CLI uploads therefore use an invocation-scoped fetch adapter for only the exact
preview hostname. The installed ignored app fixture changes only its avatar PUT
URL routing to the local backend for that same hostname. Production app source
uses the original signed upload URL. The image itself was uploaded, bound to the
record and loaded in the browser; an analytics-style success alone was not used
as proof of avatar success.

## State and Limits

Implemented and installed in the isolated preview only. No production app
installation, influencer import, GitHub token configuration, commit, merge or
production deployment is claimed. Only a handful of unauthenticated public
GitHub profile/social calls were used for manual verification.

Hindsight recall was unavailable because this VM lacks the private repository
profile. No remote-memory retention is claimed; the verified implementation and
operational findings are documented here and in the package README.

## Follow-Up: Population from Live Influencers

[Decision 0002](../decisions/github-profiles/0002-populate-preview-from-live-influencers.md)
records the subsequent approval to populate this preview from live CRM links,
expanding the original demo-only data scope. The preceding state describes the
initial handoff; this follow-up records the later populated preview.

Fresh read-only CRM queries found 34 importable GitHub accounts across 33 active
influencers after excluding a note that explicitly rejected an unrelated brand's
link. Structured GitHub fields on related contacts contained no additional links.
Organization accounts and a corroborated project-owner account were included.
Only influencer source IDs and names were copied to establish the preview
relations; full influencer/customer/contact records were not cloned.

All 34 profiles imported successfully, including 31 users and three organizations.
The existing demo profile was preserved, for 35 profiles total. Both raw JSON
responses matched their fetched values on readback. Provider URL fields matched
GitHub's listed social accounts (allowing Twenty's normal trailing-slash
normalization), and all 34 native avatars were bound. Nullable flags retained
their source values. Private import and verification artifacts are in the ignored
`.context/github-preview/` directory; no customer dataset was added to Git.

The batch used 68 authenticated public API requests through the owner's existing
GitHub CLI, sequentially, with quota checks. That CLI's token remained on the
owner's Mac. Preview writes reused the app's synchronization handler, response
schemas and avatar helper against the cached responses, and checkpointed each
result. There were zero import failures and no paid API calls. Production CRM
access remained read-only.

The app still works without GitHub login and supports optional `GITHUB_TOKEN` for
higher limits. Without a token, the ordinary public REST limit is 60 requests per
hour per source IP; personal-token requests ordinarily share a 5,000/hour user
allowance. A profile refresh needs at least two REST calls. The app reports limit
errors and primary reset times; automatic Retry-After waiting, exponential
backoff, and durable scheduling are not implemented. The one-off importer stops
on detected quota exhaustion rather than repeatedly requesting a limited API.
No GitHub secret was configured in the preview as part of this import.


## Follow-Up: People, Companies And Pooled Authentication

[Decision 0003](../decisions/github-profiles/0003-many-to-many-source-workflows-and-key-pool.md)
records the owner's request and clarification that both new relations must be
many-to-many. The maintained README describes the current configuration and
replaces the earlier single-token/no-durable-scheduling limitations above.

The app now owns two junction objects, unique source/profile indexes, reverse
fields on People/Companies and four related-record paths. Two exported native
workflows handle created/updated People and Companies; disabled sources do no
GitHub work. The Sync page provides source mapping, separate automatic switches,
three synchronization modes, optional automatic-link cleanup and explicit
checkpointed backfill controls. Native encrypted GitHub API key connections
support credential fallback, account-wide quota cooldowns and shared secondary
throttling. Direct Fetch/Refresh reports reset times; queued work reschedules.

Read-only live inspection confirmed People's existing GitHub Links field but no
dedicated Company GitHub field. The real app defaults the People mapping and
leaves Companies unselected. The isolated fixture adds a Company GitHub Links
field only to demonstrate source mapping; that field is not provisioned by the
app and no production field was added. Domain-name fields are deliberately
excluded from choices because native normalization removes username paths.

### Verification Of This Update

- Forty tests passed, including shared relations, idempotency, cleanup boundaries,
  restoration, concurrent profile creation, native-key selection, primary/secondary
  cooldown behavior, bounded transient retries and deferred job checkpoints.
  Package typecheck and lint passed; the CLI built and applied the app update.
- Native link-only backfills completed for People and Companies. The scans
  covered 1,202 People and 601 Companies in the demo workspace, with two matching
  synthetic records per source. They made no GitHub requests.
- A Company GitHub-link update triggered its native workflow, queued a job,
  created a missing public vendor demo profile and kept its existing relation.
  A Person update then triggered the other workflow and linked both profiles.
  Multiple people and companies share the same profiles without reassignment.
- Deleting a demo junction and rerunning a link-only backfill restored its original
  ID. Compound pair indexes include soft-deleted rows; restoration avoids a
  duplicate-key failure when links are removed and later re-added.
- The original 35 profiles were preserved. Automatic-create verification added
  one public vendor demo profile for 36 total. No customer records from live
  People or Companies were copied. Automatic sync was restored to disabled and
  the original Company source selection remains empty.
- An authenticated browser loaded the Sync page without page exceptions,
  changed/saved/restored anonymous-access settings, previewed a link-only backfill
  and ran it to completion through the native UI. Native app settings displayed
  the GitHub API Keys provider and Add Connection control. Browser checks used
  the same local TLS/host mapping described above; the Conductor edge itself
  remains gated. Screenshots are private `.context/` artifacts.
- GitHub credential waterfalling is verified with simulated HTTP responses and
  native connection fixtures in tests. No real token is configured in the
  preview; a successful live multi-key run is not claimed.

Two integration issues were fixed in source. Database workflow variables use
`trigger.recordId`, as confirmed by actual run payloads. A warm queue worker
retained an old application-variable environment after an update, so each job
now loads the latest saved configuration through the metadata API. Source-field
discovery also enumerates native object metadata rather than relying on standard
object constants at runtime; definition-time SDK constants remain in schema files.

Private run results and browser artifacts remain in `.context/`. Production
access was read-only. This update is implemented and installed in the preview
only; no commit, merge, production installation or deployment is claimed.


## Follow-Up: Username, Supplied Icon, OAuth And Settings Usability

[Decision 0004](../decisions/github-profiles/0004-username-field-label.md) records
the Username label and supplied JPEG icon. The field keeps its `login` API name
and universal identifier. Native metadata readback confirms Username. The app
logo download matched the supplied image byte-for-byte.

[Decision 0005](../decisions/github-profiles/0005-oauth-and-clear-per-object-backfills.md)
records the preference for OAuth, understandable selections and independent
backfill settings. The app now installs a GitHub OAuth workspace provider alongside
the retained personal-token provider. OAuth tokens are preferred in the pool.
Server variables expose administrator configuration for the GitHub OAuth client
ID/secret. The Sync page contains registration steps, the exact callback URL and
fine-grained personal-token instructions. Real OAuth authorization remains
unverified because no OAuth registration credentials have been configured.

The owner's 401 screenshot exposed a real integration issue missed by local
TLS checks: the host fetch bridge intentionally omits proxy/session cookies for
custom `/s/` routes. Setting `fetch.credentials` inside the component cannot
change that host policy. Source now invokes owned functions through native
metadata execution instead. This preserves the host policy and uses its
cookie-eligible metadata path. The role adds the required Workflows permission;
backfill management continues to check Applications permission. No host frontend
patch is required. Field-loading failure now blocks editing and offers Retry,
without displaying UUIDs or default settings as if they were loaded preferences.

Portal selects were replaced by labelled native selects with descriptions for
Link Only, Create Missing and Create and Refresh. Backfill behavior and scan size
are saved separately per source; All Records uses background paged scanning.
Scanning stops at a reviewable plan and never starts GitHub fetching. A Save
Backfill Preferences button sits beside Preview Backfill. Existing saved settings
and native connections are preserved; new preference properties have defaults.

### Verification

- Forty-eight tests, typecheck and lint passed, including OAuth-before-token
  selection, failed OAuth without anonymous fallback, scans beyond 5,000 records,
  custom-cap truncation, cancellation and preview-only queue behavior.
- Native metadata function execution loaded four People field choices and three
  Company choices and returned the preview's correct OAuth callback URL.
- A fresh authenticated dark-mode browser showed the GitHub field label, readable
  native options and mode explanations. It saved People as All Records/Link Only
  and Companies as 100/Create and Refresh; independent values were confirmed
  through the metadata API. Original preferences were then restored.
- The browser's All Records preview scanned all 1,202 demo People, found two
  matching synthetic records and waited for an explicit Run click. The link-only
  run completed without GitHub requests. It made zero custom `/s/` requests and
  raised no browser exceptions. Profiles remained at 36.
- Native provider metadata lists both `github` (`api-key`) and `github-oauth`
  (`oauth`). Credential ordering and quota behavior use test fixtures; no real
  personal token or OAuth client secret was added.
- A native metadata Fetch action refreshed the existing public Octocat demo with
  both providers installed but no credentials configured. This verified anonymous
  operation and the migrated execution path using two public GitHub API requests;
  the existing record and avatar were reused. No customer refresh batch ran.

Browser checks used the local TLS/host mapping described earlier. A real
Conductor-edge browser session was not available to the agent, so the edge-cookie
fix is supported by source policy inspection and the switch to the authenticated
metadata bridge, rather than a claimed authenticated-edge test. Updated private
screenshots and run results live under `.context/`. Source and preview only;
production was not changed.


## Follow-Up: Shared Setup Controls

[Decision 0006](../decisions/github-profiles/0006-use-shared-twenty-controls-for-setup.md)
records Kareem's rejection of the browser-default setup link and cramped switch
spacing. Both external setup actions now use the shared Twenty Button link API,
and the switch is inside the existing spacing container. `DESIGN.md` explicitly
reinforces the same shared-component rules for app setup/authentication screens.

Typecheck and lint passed. The preview was updated and browser checks confirmed
32px outline buttons without underlines, correct destinations and 16px separation
from the switch with both light and dark browser theme preferences. No page
exceptions occurred. No GitHub requests or CRM data changes were needed.


## Follow-Up: Connection Status Instead Of Developer Setup

[Decision 0007](../decisions/github-profiles/0007-keep-developer-setup-out-of-sync.md)
records the rejection of the developer OAuth walkthrough in normal settings.
The Sync page now shows OAuth readiness and connected-account/reconnect status,
links to Twenty's native connection manager, and keeps token instructions closed
until requested. The frontend status queries select provider readiness and
connection metadata, never access tokens. Developer setup remains in the README
and native developer configuration; it is not falsely reported as completed.

Typecheck and lint passed. A fresh browser checked the pending state, hidden
developer details, optional help and native connection-manager navigation, with
no page errors in light/dark verification. No records or GitHub data were changed.


## Follow-Up: Real GitHub OAuth Connection Verified

The owner completed the new OAuth app registration, configured the client ID and
secret directly in native developer settings, and signed in. Native provider
metadata reports ready. Read-only inspection confirmed one healthy OAuth
connection and zero personal-token connections. The app's Fetch action then
refreshed its existing public Octocat demo through the OAuth-first pool. This
used the profile/social requests plus an initial account-identity check; the
existing record and avatar were reused, keeping 36 profiles. No customer batch,
production deployment or production write ran. No client secret or access token
was inspected or saved in documentation. Real OAuth API use is now verified;
expired-token refresh and multi-account live waterfalling are still covered by
source/tests rather than fresh live demonstrations.


## Follow-Up: Twenty Dropdowns And Refresh Semantics

[Decision 0009](../decisions/github-profiles/0009-use-twenty-select-and-explain-refresh.md)
records the explicit rejection of the browser-native menu and the request to
explain Refresh Profiles. All six settings selectors now use shared Twenty
Select/Field components. There are no native HTML select/option controls in the
settings component. Refresh help describes replacement of GitHub-derived fields
on the same record and preservation of its CRM links.

Two SDK integration issues were corrected without changing shared styles: native
component-generated IDs collided with host IDs, so the app supplies namespaced
root/label/trigger/listbox IDs; portals initially used a host/root coordinate
frame that misplaced them, so each mounts in its own positioned field container
inside the app's shared scoped ThemeProvider. Browser readback confirmed menus
match their trigger width and open 4px below it in both themes. All selector
options, mode changes and Escape dismissal worked with no page errors. Package
typecheck and lint passed; updated screenshots remain private in `.context/`.

Kareem also clarified that changing a source URL should retain old relations.
Readback confirms removal is already off for both People and Companies. In that
state a new matching profile relation is added and previous relations remain;
Link Existing Profiles Only skips a new account absent from the CRM. Repeated
syncs do not duplicate a pair. No preferences or records were changed for the
clarification or UI verification. Production is unchanged.

## Follow-Up: Commit Email Command And Workflow

[Decision 0010](../decisions/github-profiles/0010-commit-email-command-and-workflow.md)
records the request for commit extraction and a separate column. GitHub Profiles
now provides the native Extract Commit Emails record command and Extract GitHub
Commit Emails workflow action. Commit Emails is a separate read-only Emails
field; profile Email and the two raw API response fields remain untouched.

Extraction verifies the immutable GitHub account, searches public indexed commits,
excludes profile addresses, deduplicates case insensitively and keeps source commit
URLs. Repeated runs merge prior evidence for the same account. Coverage status,
timestamp, note and scanned count explain partial results; failures preserve
previous successful results. Search quota is tracked independently from ordinary
REST quota in the existing OAuth-first pool. This does not start a customer batch.

All 60 tests, direct typecheck and lint passed. Native OAuth execution and a draft
Extract Commit Emails Demo workflow completed successfully on the public Octocat
demo with a one-page cap. A fresh browser then ran the record command with its
default ten-page cap: 1,000 commit records scanned, three commit-only emails saved,
and Partial Search correctly reported. Final API readback confirmed profile Email
and both raw responses were unchanged and no profile addresses entered Commit
Emails. The browser reported no page errors. Screenshots, workflow IDs and private
verification artifacts remain under `.context/`; browser checks used the local
TLS/host mapping described above. Production was not changed.

Kareem also asked how often profile data updates. Current source has no scheduled
polling: explicit fetch/refresh actions update the profile when run; source event
sync refreshes existing profiles only in Create and Refresh mode and skips
unchanged sources. The preview's People and Companies remain Link Existing
Profiles Only. Commit extraction is a separate explicit action. The README now
states this behavior. Remote Hindsight access remains unavailable; durable
verification is retained here without claiming a remote memory write.

## Draft PR Handoff

On 2026-11-22 Kareem requested "Create a PR" with attached instructions specifying
a draft against `origin/main` covering all workspace changes. This includes the
complete GitHub Profiles app, design guidance, decision records and this handoff.
The source is prepared for review; opening the draft does not merge or deploy it.

## Follow-Up: Noreply Filtering And Command Settings

[Decision 0011](../decisions/github-profiles/0011-configurable-noreply-email-filter.md)
records the request for an app default and per-run overrides. Skip GitHub Noreply
Emails is enabled by default, including for older saved settings. Workflow/API
`skipNoreplyEmails` is optional: omit to inherit the saved app default, true to
skip and false to include. Filtering matches the exact domain case insensitively,
including previously sourced addresses on the next successful scan. Saving
preferences alone does not edit profiles or start a cleanup batch.

Extract Commit Emails now opens a native side panel before running. Its shared
Twenty Select offers Use App Default, Skip Noreply Emails and Include Noreply
Emails; a page-limit field retains the existing 1–10 range. Run settings do not
change the app default. The pre-existing scoped theme, unique IDs and local
portal integration were moved into a reusable app component shared with Sync.
No shared Twenty styles or primitives were modified. The new preference switch
has an explicit accessible name. Workflow metadata exposes a human-readable label
explaining that a blank override uses the app default, and output/evidence record
the effective policy and skipped commit count.

All 65 tests, direct package typecheck and lint passed. Tests cover inherited and
explicit settings in both directions, mixed-case domains, exact domain matching,
and removal of previously collected noreply results. The native demo workflow
completed with an explicit false override while the saved default was on; the
draft was then restored to inherit the default. Browser checks verified that the
app preference saves/reloads and that both themes use the shared dropdown in the
command panel. Source and preview only; production remains unchanged. Remote
Hindsight is unavailable because the private profile is absent; no remote write
is claimed.

The final browser run completed both Include and inherited Skip command runs on
the public demo with a one-page cap, blocked an invalid page limit, and closed
through Cancel with no page errors. Opening the panel made no extraction request.
Final API readback confirmed no matching noreply addresses remain in Commit
Emails, while profile Email, both raw API responses and unrelated app preferences
are unchanged. The saved default is on. Browser verification used the existing
local TLS/host mapping and the bundled 2.60.3 host; it does not claim authenticated
Conductor-edge verification. No customer extraction batch ran.
