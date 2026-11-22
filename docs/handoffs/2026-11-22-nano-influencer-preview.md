# NanoInfluencer App And VM Preview

Current state: the isolated VM supports **live Nano list sync, saved search-history/result import and explicit
profile enrichment** through the owner-added connections. Native avatars, raw
profile/enrichment JSON, email-based People relations and workspace preferences
are installed. It exposes gateway port **3003**, forwarding to
Twenty on 3002. Paid contact matching, new search submissions and outbound Nano calls remain disabled in the
VM fixture. Automatic sync defaults to Manual Only; Daily At 04:00 UTC is available
in its Nano Sync preferences. Earlier demo-verification sections below are historical. See the final section for current verification and limitations.

The app source is in [internal/nano-influencer](../../packages/twenty-apps/internal/nano-influencer/README.md).
The [decision](../decisions/nano-influencer/0001-native-nano-sync-and-discovery.md)
contains Kareem's scope and preview request. Source changes are being packaged for draft review;
no production app was installed or changed.

## Implemented

Six related native objects represent creators, Nano projects, per-list
memberships, searches, search results and Nano decision makers. Creator identity is unique
per platform and Nano ID. List membership carries favourites, hides, labels and
notes. Sync jobs paginate favourites and hides separately, then reconcile
missing memberships only after complete reads. Commands and workflow actions
share the same handlers. Outbound actions save state in Nano before saving the
local membership. Lookalike jobs have an idempotent request identifier,
resumable polling and chunked result import.

The app calls Nano directly using its session-cookie protocol. It does not
require the Creator Eagle runtime. Source protocol evidence was inspected in
Creator Eagle at `5993942`; the initial build had not yet verified live Nano responses.
Labels/notes pull from Nano. Their outbound editing, project lifecycle writes
and next-page discovery commands remain outside this implementation.

## Preview

The initial VM exposed port 3002 directly through Conductor; obtain the link with
`conductor preview get`. The host is the published `twentycrm/twenty:v2.59.0`
image, not a build of the repository's host frontend. Docker containers named
`nano-preview-server`, `nano-preview-worker`, `nano-preview-postgres` and
`nano-preview-redis` use host networking and restart unless stopped. Database
and application storage use dedicated named Docker volumes. The source app
uses Twenty SDK 2.59.0.

The initial ignored `.context/nano-app-preview` fixture preserved the production
app source, changed Nano transport to a local demo API, supplied demo
configuration and omitted scheduled account sync. The demo API is a detached
process on loopback port 3334; it serves two example projects and three neutral
creators. Changes affect only its in-memory demo flags. No real Nano credentials,
customer CRM records or production database snapshots were copied. No paid Nano
calls were made. The host also contains Twenty's standard development seed.

Private runtime environment, CLI credentials, browser session and verification
scripts are in `.context/nano-preview/`. Never commit their contents. A private
TLS proxy on 3443 permits Chrome to test the exact HTTPS origin using host
mapping; it is not the public listener. Anonymous requests to the Conductor edge
return 401, which is its sign-in gate. Browser checks verified the app with local
origin mapping, not the owner's authenticated edge session.

The demo API and browser-only TLS helper survive tool calls through detached
processes. Docker containers restart after process failures. No VM wake or
shutdown recovery has been configured; the in-memory demo API state resets if
that process is restarted. Do not reset the database to repair a stopped
preview. Start the existing containers and the saved helper scripts instead.

## Verification

- Fifteen unit tests passed, plus direct `tsgo --noEmit`, oxlint and app build.
- The initial metadata plan created five objects with no deletions. Real server
  validation caught reserved field names; source uses `relatedLinks`,
  `lookalikeSearches` and `nanoSearch` instead. MANY_TO_ONE relations declare
  join columns. Subsequent upgrades also applied without pruning or deletions.
- Backend `/healthz` returned 200. Seeded email/password sign-in succeeded.
- A real queued sync against the demo API imported both projects and the correct
  two initial creators/three memberships, including hidden state.
- An authenticated lookalike request and the native **Find Nano Lookalikes**
  command created searches. Background polling imported the third creator and a
  related search result without implicitly favouriting it.
- Favourite/hide route actions round-tripped to the demo API. The native **Add
  to Nano List** side panel loaded lists, accepted a selection and created a
  favourite membership in both systems. The side panel was checked in light
  and dark mode.

A live account session token and external Nano response verification are still
needed before production use. Hindsight recall was unavailable because the
workspace's private memory profile was missing; findings were checked against
current source and recorded here instead.

## Enum Correction, Enrichment And Connections — 2026-11-22

The current preview has the NanoInfluencer folder, native Platform Select,
**Enrich With NanoInfluencer** command/workflow and two native workspace API
connections. The real source keeps Nano URLs; only the ignored preview fixture
rewrites transport to the local demo API. The sample API now isolates favourite
state per demo session, and returns richer profiles for enrichment checks.

Lists and searches store their originating connection. Project keys include the
connection ID. Membership keys use the Twenty list ID, preventing collisions
between accounts with equal project IDs. Profile reads can rotate past a
401/403/429; outbound mutations and search polls never switch accounts. Legacy
unbound records are retained, and cannot silently use another account. Native
connections take precedence over the deprecated single-token variable.

Eight new Select fields cover the enum audit of Nano, Cal.com, PlusVibe, Slack
and LinkedIn. YouTube's calculation status and existing multi-value enums already
used native types. See [operations](../../packages/twenty-apps/operations/README.md)
for the resumable backfill and [decision 0007](../decisions/0008-use-native-enum-fields-across-apps.md)
for the rule now stored in canonical repository instructions. No production app
or record was changed in this session.

Cal.com is additionally installed in this VM with OAuth unconfigured and no
scheduled sync, using eight synthetic bookings. The backfill updated six
historical booking statuses and one remaining Nano platform. Blank input stayed
blank, an existing populated selection stayed intact, raw values remained, and
a second dry run reported zero changes. Browser checks verified Select labels
in both tables, grouped Nano navigation, enrichment through its actual command,
and two connected native API entries on the app settings page. Enrichment
refreshed subscriber counts and biographies without changing memberships.

Verification: 22 Nano tests, 38 Cal.com tests, 142 PlusVibe tests, 89 Slack tests,
10 focused LinkedIn mapper tests and three backfill tests passed. Direct
TypeScript checks passed for the affected apps. Cal.com, PlusVibe, LinkedIn and
Nano app builds passed. Published Twenty CLI 2.59/2.60 blocks the full Slack
package on its existing `channelObject` UUID reference, treating it as a duplicate
entity. The current repository CLI validator already excludes that reference
(`packages/twenty-cli/src/app/manifest/manifest-validate.ts`); CLI 2.61 is not yet
published. The Slack enum definition, ingestion and view tests pass, but a
complete Slack package should be built with the repository CLI or a released
CLI containing that fix before deployment. Do not remove the channel mapping or
change its universal identifier to silence this tooling mismatch.

## Command Error Diagnostics — 2026-11-22

The owner reported a failed **Sync All Nano Lists** command after adding a
connection. A browser replay on the VM sent the authenticated POST to the
public-origin `/s/nano-influencer/sync` route, returned HTTP 200 and queued two
demo lists. The reported failure was not reproduced, so its root cause remains
unconfirmed. This check used the local origin mapping, not the owner's edge
session, and did not validate the real Nano credential against Nano.

Nano front-component errors now retain the server's `messages`/`message`, or the
network error, in the snackbar's detailed message. This replaces the prior
catch-only generic explanation. Three focused tests cover server, network and
unknown errors; the Nano suite now has 25 tests. The preview fixture still uses
the demo Nano transport.

## Preview Edge 401 — 2026-11-22

The owner's new screenshots show HTTP 401 from the public `/s/nano-influencer/sync`
URL, with no Nano-origin error details. One screenshot shows Nano's distinct
30-day AI-agent Access Token UI. The current integration uses a NextAuth session
cookie; neither credential type has been validated against live Nano in this
preview. Adding another connection does not establish token validity.

Source inspection found `isPageCookieEligiblePath` deliberately excludes `/s`;
its host fetch policy sends `credentials: 'omit'` there. A browser test with a
non-sensitive test gate cookie reproduced two HTTP 401s (initial attempt plus
SDK token refresh): bearer present, preview cookie absent. This supports an edge
authentication failure and explains the earlier host-mapped success; the owner's
actual edge response body remains unobserved.

An isolated gateway now listens on 3003 and forwards to the preserved Twenty
backend on 3002. The public URL is unchanged. The ignored Nano fixture's nine
front components use `/rest/nano-preview/<action>`, an API prefix where the
renderer carries page cookies. A six-action POST allowlist translates those
requests back to their original authenticated app routes, stripping cookies,
session opt-in and proxy identity headers before forwarding. The production app
source and host renderer policy remain unchanged. Backend/worker internal URLs
remain on 3002. No saved connections were modified or deleted.

Recovery: start `.context/nano-preview/preview-gateway.cjs` detached, expose
`conductor preview set --port 3003`, and have the TLS helper on 3443 forward to
3003. Keep the gateway running alongside Docker, the mock API and TLS helper.
Plan/apply updated nine front components with zero deletions; apply uploaded 51
files successfully. Gateway health returned 200, cookie-only requests without a
bearer were denied (403), and unknown aliases returned 404. Browser verification
and its remaining edge limitation are recorded below.

The same browser test gate now observed both the preview cookie and Twenty bearer
on `/rest/nano-preview/sync`; the command returned HTTP 200 and queued four demo
lists for the two saved connections. All nine fixture front-component files were
checked against production source: only the route prefix differs. The fixture's
Nano client still points to the local mock. This verifies the transport repair
under a simulated preview gate, not live Nano credentials or the owner's actual
Conductor edge session. No production changes or external Nano calls occurred.

## Live Import — 2026-11-22

The owner reported that only demo lists appeared despite having many lists in
Nano. See [decision 0004](../decisions/nano-influencer/0004-import-real-nano-lists-in-preview.md).
A temporary authenticated, read-only diagnostic in the ignored fixture checked
the owner-added native connections without exposing tokens or record contents.
One connection returned 60 projects. The other returned HTTP 403 on Nano's
session-cookie list endpoint; this does not establish whether its token works
with a different Nano API. Nano's [public API documentation](https://www.nanoinfluencer.ai/public-api/docs)
describes a separate bearer-key surface for profile resolution, searches and
tasks; it does not document list synchronization.

The fixture now uses real Nano URLs for GET project/membership reads and refuses
all other Nano requests. This supersedes the demo-only transport described in
earlier sections. No scheduled sync, paid discovery/enrichment or Nano writes
were enabled. The backend and frontend data remain isolated to this VM. The
Conductor gateway on 3003, backend on 3002 and browser command aliases are retained.
Existing ten demo lists and their sample records remain distinguishable by their
Demo names; saved connections were preserved.

The first real import created all 60 projects. Real responses exposed structured
emails (`{type, value}`) and nullable countries; the production parser now accepts
these shapes while rejecting malformed email objects before reconciliation.
Sync discovery now reports account-specific failures while continuing with
usable connections. Its command presents partial connection failures separately.

The initial parallel creator import also exhausted Twenty's default application
API budget. The source now recognizes GraphQL RATE_LIMITED subcodes, retains
completed creator offsets in the page job, and defers the remainder using the
server's retry timing plus jitter. Nano read HTTP 429 is likewise deferred. New
pages reset their offsets; reconciliation still waits for complete reads. The
first batch is delayed 30 seconds to let discovery finish before worker traffic.
No application rate limit was raised or bypassed. Unit tests cover partial
connection failure, email formats, null countries, retry timing, checkpoints and
resumption; all 33 Nano tests, direct TypeScript checking and lint passed.


The shared workspace helper now uses native `createOne(..., upsert: true)` for
unique external identities, with recovery when a concurrent creator wins the
same identity. Membership migration reads request one record rather than 100.
A synthetic-record integration probe verified native upsert preserves the record
ID and omitted fields. Ordinary `create` retains `upsert: false`, preserving the
paid-search claim's duplicate rejection. A concurrency regression test passed.

To keep the isolated VM responsive, its BullMQ `logic-function-queue` global
concurrency was set to two using the queue API. This is a preview runtime setting,
not a production limit change. The worker normally starts with concurrency 20;
reapply the global cap after a worker restart because the driver can remove an
undeclared global cap. Include `prioritized` in queue-count checks: SDK jobs have
priority and are not included in the `waiting` count. Existing queued jobs and
their checkpoints were preserved. The browser verified actual Nano list records
in the standard list table; real creator and membership counts were increasing
with zero list errors after the retry fix. Completion remains separate from this
in-progress verification.

Final snapshot at 2026-11-22 14:27 UTC: all 60 actual Nano list records were in the
VM; two list jobs had completed and 58 were still syncing. Counts had increased
to 190 creator records and 167 membership records (including preserved demo
records), with zero list errors. This is an in-progress import, not a claim that
all creators have finished syncing. Final app apply succeeded with no pruning;
the fixture was checked for live Nano URLs and its read-only guard. Source tests
remained at 33 passing with typecheck and lint clean. The second native connection
still returns 403 for session-based list access. No credential was deleted,
replaced or copied into documentation, and no production or paid Nano action was
performed. Hindsight's private profile remained unavailable, so verified findings
are documented here instead of claiming memory retention.

A follow-up at 14:28 UTC verified continued progress after the native-upsert
update: 230 total creator records and 224 memberships, still zero list errors.
The queue retained pending work (including prioritized jobs) under its global
concurrency cap, and the browser rendered the actual list names and Nano folder.
The remaining creator/membership import continues asynchronously.


## Creator JSON, Avatars, People And Sync Preferences — 2026-11-22

Owner requirements are recorded in [decision 0005](../decisions/nano-influencer/0005-preserve-profile-json-and-native-avatars.md)
and [decision 0006](../decisions/nano-influencer/0006-configure-people-sync-deletion-and-attribution.md).
The installed fixture now permits explicit profile GETs and URL lookup alongside
project/membership reads. Search submission, contact matching and Nano-side flag
writes remain blocked. Profile refresh is not part of the daily list pull.

Creator fields now include separate Raw Nano List Data, Raw Nano Profile and
Enrichment Results JSON. Related Links remains Raw JSON. Normalized fields do
not strip unknown fields from the stored raw snapshots. A verified live profile
retained recent-post arrays and views/likes/comments/engagement analytics; array
lengths vary, so this is not a fixed ten-video model. Ordinary list sync leaves
the richer profile JSON intact. Historical snapshots that were never retained
cannot be reconstructed without another read; older rows fill when refreshed.
Creator uniqueness remains platform plus Nano ID, with separate per-list
memberships.

The owner reported Untitled email chips. A read confirmed empty strings in the
email array. Source normalization now removes blanks and duplicate normalized
strings, with the original values retained in new raw snapshots. A VM backfill
updated 320 creator rows without dropping non-empty addresses. A later full scan
reported zero remaining blank-email records and zero further updates needed.

Native Avatar files are now the creator image identifier. Queued imports use
bounded downloads from supported image hosts and native file registration,
signed PUT and completion before binding the file. The Nano image CDN required
a public referrer and generic browser user agent, returning JPEG content with
`binary/octet-stream`. The helper recognizes supported image signatures in that
case. No Nano authentication cookie is forwarded to the image CDN. Only the
ignored fixture maps its exact preview-host signed upload to localhost, preserving
the signature path/query. A real native file was bound successfully, and the
browser verified the record portrait and loaded image dimensions. Earlier failed
image attempts remain visible in normal record history; current Avatar Error was
empty for the verified record. Existing avatars continue filling through jobs.

Native workspace preferences are under Settings → Apps → NanoInfluencer → Nano
Sync. All four settings use Select application variables: Person Auto-Creation
(None/Favourites/All), Removed Nano Entries (Keep/Trash Memberships), Deleted Nano
Lists (Keep/Trash List And Memberships), and Automatic Sync (Manual/Daily 04:00
UTC). Current values remain None, Keep, Keep and Manual. The existing server's
CronTriggerCronJob scheduler was verified in BullMQ; the new scheduled-sync
function runs only when Daily is selected. This supersedes earlier notes that
cron registration was assumed off. A sleeping/stopped VM does not run its cron.

People are matched by complete, normalized primary/additional email addresses;
substring query candidates are checked exactly. Ambiguous results stay unresolved,
manual Person relations are retained, and the selected creation policy controls
new People. Creation uses a stable ID and recovers concurrent existing records.
Role permissions cover People read/create and workspace-member read, without
People or creator deletion. A native runtime check related a synthetic creator
to an existing synthetic Person under the default None policy. Both isolated
test fixtures were then moved to Trash using the owner test operator, without
modifying customer People.

List Owner is a native editable workspace-member relation. Nano's verified
project response contains only ID, title and timestamps, so no Nano project owner
is inferred. Membership Decision By, operator ID/email and raw snapshots map
`op_uid` through `op_users`. A sample of recently queried memberships confirmed
populated attribution on newly refreshed rows; earlier rows require refresh.
These fields describe the last fetched favourite/hidden decision, not an inferred
actor for a remote deletion.

Both removal settings default to Keep, as requested. Removed memberships are
reconciled only after both feeds complete. Missing projects are inferred only
from successful account snapshots. Opt-in policies use native Trash for the
membership, or the missing list and its memberships. Creators and People remain.
Queued list cleanup rechecks its policy and the list's removed state when it
runs. No real deletion policy was enabled or exercised against customer records.

Verification: 64 unit tests, direct TypeScript checking and lint passed. Native
browser checks covered preference rendering, select controls, saving and reload;
Daily persisted during the test and was restored to Manual through the UI plus
a final explicit reset. Native runtime checks verified full JSON persistence,
existing-Person matching, file upload/completion/binding, and a loaded portrait.
The browser uses local TLS host mapping and bypasses the Conductor edge; the
owner had previously confirmed the fixed browser command queues through the edge.
All app plans used no pruning and had zero deletions. The source app and all
related changes remain uncommitted, with no production installation or rollout.


Final runtime safeguards also retain an existing non-empty creator email when a
Nano response contains no available email, and recognize both standard and
subcode GraphQL rate-limit formats. Native queue inspection verified all 47
then-active list runs had queued work for their current run ID; none were left
without a continuation. Photo and Person jobs remain queued as expected under
the preview concurrency cap. Full-record imports are still in progress, not
reported complete. Final UI copy keeps labels in Title Case and explanations in
sentence case.


## Search History, Contact Cleanup And Grouping — 2026-11-22

The owner clarified that email grouping means both the membership decision-maker
email and creator Has Email/No Email. See decisions 0007 and 0008.

- Added **Sync Nano Search History**, with account-pinned paginated imports of
  existing logs and available keyword/similar results. The working connection
  reported 529 saved history entries. New searches are never submitted by this
  import. Expired/removed tasks keep their history and show Unavailable, with the
  provider response retained where available. Saved keyword pages are current
  collections, not reconstructed historical batch snapshots. Raw search logs,
  raw result rows and full page/task responses remain JSON.
- Cleaned non-email labels such as Twitter DM, masked strings and blank contacts
  from displayed emails while retaining source snapshots. Country is a native
  Select with names/codes normalized and old text retained as Country (Raw).
- Added native **By List**, **By Creator**, **By Decision Maker**, **By Country**
  and **By Email Availability** views. The first three belong to memberships;
  the last two belong to creators. Native relation groups are explicitly seeded
  from real memberships. The refresh preserves saved visibility/order and custom
  grouping fields, and only targets the app's known views. Country groups use
  actual stored values instead of unused options filling the visible groups.
- Nano Users provide decision attribution without creating People or workspace
  members. Email labels identify decision makers where available. Nano's project
  response still does not provide list ownership; List Owner stays manually
  assignable rather than being inferred from a favourite/hide actor.
- Email Availability is a required native Select defaulting to MISSING, with
  AVAILABLE/Has Email and MISSING/No Email. Nano saves derive it from the stored
  usable addresses, preserving known emails when incoming Nano emails are empty.
  Filtered native create/update batches maintain it for edits made in Twenty;
  tracking the derived field also corrects stale concurrent writes. A repair
  reads the current record rather than applying an old event's emails.

Verification: 98 standalone app unit tests, direct tsgo typecheck and oxlint
pass. SDK plans/apply completed with zero deletes. The repaired metadata query
uses ObjectFilter.universalIdentifier; nameSingular is not an allowed filter.
SDK view-field validation requires Name to occupy the lowest position. Browser
checks rendered records in all membership groups with no GraphQL errors. Creator
Country/Email Availability views render records; a settled browser check confirms
Email Availability, Has Email and No Email labels. The VM browser uses the exact
origin through local TLS mapping; this bypasses Conductor's edge. The supplied
creator-group-picker screenshot contains only metadata/view names, not customer
record contents.

The contact/country/availability repair backfilled 1,704 existing availability
values. A fresh scan of 5,031 creators found zero remaining contact, country or
availability corrections. A separate synthetic creator verified native creation
sets Has Email and removing its email sets No Email; that test record was moved
to Trash afterward. Two lists that had timed out were requeued; the subsequent
live-list scan reported no errors. Read-only list timeouts/5xx now retry three
times from the completed channel offset. Rate-limited result imports checkpoint
every completed result instead of replaying an entire unfinished chunk.

At 17:50 UTC, 160 real Nano history entries and 1,674 related result rows had been
imported. This is ongoing work, not completion of all 529 entries or all saved
results. Some history result sets are unavailable on Nano. One additional saved
connection still rejects history authentication; it was preserved and is reported
separately. Existing list, avatar, People-match and history queues remain active.

### VM Runtime Tuning

The server's application API budget was raised from the default 500 to 2,000
requests/minute in this isolated VM. The private runtime env is in
`.context/nano-preview/server-api-limit.env`; no credentials are in this document.
The server was recreated with the same image, network, environment and storage
volume, preserving record counts. The stopped
`nano-preview-server-before-api-limit` container is a rollback reference; do not
start it alongside the current server on the same port. No database reset or
production change was performed.

The logical-function queue has a Redis global concurrency cap of four (the worker
process default is twenty). An ignored import supervisor assigns responsive
priorities to this app's known functions; its script, pid and private log are
under `.context/nano-preview/`. It runs inside the worker and must be restarted
if that container is restarted. The older finite priority scripts are historical.
Only the known command aliases are accepted by the port-3003 gateway, now
including sync-history and refresh-groups. The app source retains production /s
routes; only the ignored fixture uses the transport aliases. Saved credentials,
preferences and data were preserved. Manual Only, no automatic People creation,
and Keep removal policies remain selected.

The source app remains uncommitted and no PR or production deployment was made.
Hindsight recall/retention tooling is unavailable because the private profile/repo
metadata is missing; decisions and this handoff retain the verified findings.


Final browser confirmation: the live creator view shows the Email Availability
column, Has Email labels and No Email labels (200 rendered rows during the
check). This was verified again with imports running. Country and membership
grouped views also rendered records without GraphQL errors. A later history
audit at 17:54 UTC counted 185 real history entries and 1,674 result rows; the
remaining import continues. Group maintenance was moved behind core data imports
in the VM priority supervisor to reduce repeated metadata-cache invalidation
while loading pages. The worker was drained, restarted and resumed without a
server or database reset. The supervisor now has an identifying process title.


## Draft PR Request — 2026-11-22

Kareem requested: "Create a PR .context/attachments/RQGFIy/PR instructions.md".
The attached instructions require a draft against main covering the entire
workspace diff, including the native enum upgrades and backfill tooling for
Cal.com, LinkedIn, Slack and PlusVibe. This authorizes committing/pushing the
branch and opening that draft, not a production deployment.

Fresh pre-PR validation passed 169 tests: NanoInfluencer 98, enum backfills 3,
LinkedIn mappers 10, Slack attachments 13, PlusVibe email/sync 35 and Cal.com
booking sync 10. Direct typechecks pass for Nano, Cal.com, LinkedIn, Slack and PlusVibe; Nano lint also passes. Runtime credentials,
preview adapters, browser state and customer records remain ignored under
.context and are excluded from the commit.


## Hide Email Availability Column — 2026-11-22

Kareem requested removing the Email Availability column, as recorded in
[Nano decision 0009](../decisions/nano-influencer/0009-hide-email-availability-column.md).
The app's All Nano Creators and By Email Availability view definitions now hide
that column while retaining the Select field, update hooks and both groups.

The isolated preview plan contained exactly two view-field visibility updates,
zero creates, zero deletions and zero destructive actions; apply succeeded.
An older All Nano Creators view also displayed the column and was hidden through
the owner's native view-field mutation. Metadata checks confirmed all three
preview views hide it and retain AVAILABLE/MISSING groups. Browser checks rendered
60 rows in each All Nano Creators view and 200 in By Email Availability, without
the column; Has Email grouping remained visible. The browser used the existing
published 2.59.0 host and local TLS hostname mapping, bypassing Conductor's edge.
This is an SDK view change; no host frontend or production deployment occurred.

The branch is now committed and published as
[draft PR #28](https://github.com/fundlevel-digital/twenty/pull/28) against main.
Earlier uncommitted/no-PR statements above describe their historical checkpoints.

## Search Inputs And Native Forms — 2026-11-22

[Nano decision 0010](../decisions/nano-influencer/0010-search-filter-parity-and-native-inputs.md)
records Kareem's corrections to search commands, API connection selection,
Lookalike Seed naming and readable filter inputs. The command and workflow now
share one input definition, including five metric ranges, email depth, personas,
country inclusion/exclusion, keyword options, Shorts, TikTok shop sales,
deduplication and continuation values. The app README maps every supported
option to its Nano request field and distinguishes seeded lookalike search from
Nano's separate keyword-only discovery mode.

New Twenty searches store Search Input JSON with validated input and the exact
request path/body before a paid submission can start. Imported history does not
invent unavailable original filters. The command generates its own retry key;
the technical workflow input remains supported but hidden. Connections are read
from native app settings without returning credentials. The global command
opens an editable form and can preselect a selected Nano Creator.

Two sandbox issues were found through browser verification: randomUUID is not
available in the opaque sandbox origin, so the command uses uuid's supported
random source; a long form scrolled the popup area outside the viewport, so the
form now scrolls internally. The preview fixture retains its live-write guard,
avatar adapter and transport aliases. No new paid search was submitted.

The host workflow renderer changes require the checkout frontend. A persistent
Vite process serves this source on port 3004, using a private proxy on 3006 that
preserves the existing 2.59 backend's metadata shape. The proxy removes optional
metadata fields unavailable on that backend, aliases its navigation folder IDs
and fills legacy navigation defaults. It does not change the database or shipped
application source. The stable API gateway remains on 3003 and backend on 3002.
This adapter verifies the requested source UI against this isolated existing
preview; it is not a production compatibility change. Local TLS hostname mapping
checks the application origin and bypasses Conductor's authenticated edge.

Source UI builds needed private VM swap outside the synced workspace. Imports
were drained and temporarily paused to avoid exhausting memory; no queued jobs
or records were deleted. The preview worker's compiled VM-only concurrency and
priority supervisor are configured for two concurrent logic-function jobs so
imports can coexist with the source frontend. The supervisor must be restarted
when the worker container is restarted. This does not alter production worker
configuration or the saved manual sync, People or removal preferences.

Fresh app checks pass 112 tests, direct typecheck and lint. Workflow helper checks
cover readable enum labels and actual connection choices. The focused host
frontend typecheck covers the changed workflow components and their dependencies;
the full host typecheck exceeded this VM's memory limit, so no full-host pass is
claimed. Hindsight remains unavailable due to the missing private profile/repo
metadata; this handoff and the decision record retain the verified changes.

Browser checks on the source frontend verified the real workflow editor and
global command: both offered two saved API connections and selected a named
country; the command also selected the deep-email option. Both displayed
Lookalike Seed, hid the retry key and showed descriptions; the workflow rendered
all five Minimum/Maximum pairs. No workflow was run or activated. The disposable
manual draft used for this check was deleted afterwards. The command's internal
scrolling fix passed the formerly blocked country-option click.

The public Conductor preview now targets port 3004 at the same existing URL.
Imports are resumed (`paused: false`) with two active jobs and a global limit of
two; existing settings and data are retained. Both workflow helper suites pass
(four tests), and the direct focused frontend typecheck passes. The app's final
metadata apply changed one front component with no creates or deletions.

A fresh browser context verified source-frontend sign-in with both seeded fields
already filled and no credential typing, followed by the loaded workspace and
Nano navigation. This host automatically advances to the email step when password
is the only configured provider. Health checks pass on ports 3002, 3003, 3004 and
3006. Anonymous access to Conductor's edge returns its expected authorization
gate; authenticated edge access was not independently tested. Preview processes
are detached and survive tool completion; no VM-shutdown persistence is claimed.
