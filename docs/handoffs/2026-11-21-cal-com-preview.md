# Cal.com OAuth App And Preview

Date: 2026-11-21. The app is merged and installed in the live CRM. Preview
OAuth and imports are verified. Live credentials are filled, but live account
consent and imports remain unverified; see the production release section below.
Earlier sections preserve the successive preview verification stages.

## Implementation

The app is in [cal-com](../../packages/twenty-apps/public/cal-com/README.md).
It defines personal and shared-workspace OAuth providers, the Cal.com Booking
object and reverse relations on People, Calendar Events and Opportunities,
a table view, navigation, a global Sync command and workflow/AI tools.
Connection hooks register/delete signed webhooks. Background jobs import history
using cursors and reconcile every six hours. Request-scoped tools prefer the
caller's personal account and never select another user's personal account.

Booking UIDs determine record identity. Source timestamps prevent stale imports
from overwriting newer state; updates check the row version to detect races.
Calendar matching uses exact iCalendar UIDs and never creates calendar events.
Only unique contact matches are linked; opportunities are linked manually.

## Preview

Preview: <https://fundlevel-w923.conductor.show/>. Open **Cal.com Bookings**.
The host is the published Twenty 2.59.0 Docker server and bundled frontend,
not a build of this checkout's frontend. PostgreSQL and Redis contain only
seeded developer data plus four synthetic Cal.com bookings. No production data
or credentials were copied. The worker is running.

Containers `cal-preview-server`, `cal-preview-worker`, `cal-preview-db` and
`cal-preview-redis` use host networking and restart policies. PostgreSQL and app
storage use named volumes. Runtime environment, CLI credentials, TLS test keys
and browser state remain private under `.context/`. Containers persist beyond
command execution; no VM wake mechanism was configured or verified.

The host's shared connection card displays the expected missing OAuth client
configuration notice. Personal provider definitions are installed and account
selection is unit-tested; the bundled older host does not expose this checkout's
new App Preferences routes. Use a compatible current host for personal settings.

## Verification

- Direct TypeScript checks and app lint pass.
- Fourteen unit tests pass: signature tampering, source ordering, no-show and
  reschedule mapping, unique/ambiguous links, concurrency, personal/shared account
  selection, disconnected jobs, cursor continuation and recurring occurrences.
- SDK build and app apply completed against the isolated preview; deferred schema
  work was processed by the worker.
- The actual sync utility created four demo bookings, updated an existing row,
  rejected a stale replay, and linked a Person and Calendar Event against the
  preview database.
- Browser login, booking table and app settings were checked using the exact
  HTTPS origin with VM-local TLS and Chrome host mapping. This bypasses the
  Conductor edge. Anonymous public health requests return its expected 401.
- The global Sync command executed through the app runtime and returned an
  actionable connect-account message without a configured connection. The
  authenticated route returned 200 with `queued: false`; an unauthenticated
  request was rejected with 403. No browser page errors were recorded.
- Backend health is healthy. No live Cal.com API calls or customer bookings were
  made; documentation requests were read-only.

Screenshots: `.context/cal-com-bookings.png` and
`.context/cal-com-new-account.png` (the latter captures installed app settings).

## Remaining External Setup

Register an accepted confidential Cal.com OAuth client with scopes `BOOKING_READ`,
`EVENT_TYPE_READ`, `PROFILE_READ`, `WEBHOOK_READ`, `WEBHOOK_WRITE` and exact callback
`https://fundlevel-w923.conductor.show/auth/apps/callback`. Configure its client
ID and secret on the application registration through the native admin controls.
Then verify consent, token refresh, webhook registration, signed delivery and
disconnect using a real account. Cal.com acceptance and credentials are external
requirements, not completed verification. Conductor edge authentication may
prevent external webhook delivery; confirm access before enabling a live account.

No automatic contact creation, organization/team-wide permissions, scheduling
mutation UI or inferred opportunity matching is included. See the app README
for supported API versions and installation details.

## OAuth Configuration Follow-Up

On 2026-11-21, Kareem reported completing client configuration after the
confidential-client / PKCE-off setup guidance. A metadata query selecting only
`key`, `isFilled` and `isSecret` verified that both `CAL_COM_CLIENT_ID` and
`CAL_COM_CLIENT_SECRET` were filled; the latter is secret. No credential values
were read or recorded by this check.

The native app settings now show **Add Connection**. Starting that flow from the
preview's authenticated demo session reached Cal.com's `/auth/oauth2/authorize`
with the exact preview callback, all five requested scopes, a state parameter and
no PKCE challenge. Cal.com redirected to `/auth/login`. The user's Cal.com sign-in
and consent remain outstanding; token exchange, refresh and real webhook delivery
are still unverified. No real Cal.com account connection was created by this check.


## Live Connection And Import Verification

On 2026-11-21 Kareem reported: "connected". Metadata confirmed one app connection
without an authentication failure. Initial setup failed because Cal.com's actual
webhook list returned string IDs while the implementation assumed numeric IDs.
The app now accepts string or numeric webhook IDs, normalizes them to strings and
escapes them in request paths. Two regression cases cover the response contracts;
all sixteen tests, direct TypeScript checks and lint pass.

The corrected app was applied to this preview without pruning or replacing the
connection. Re-running the native registration function through an authenticated
user session succeeded, registered its webhook and queued the paginated import.
The resulting database has 100 real bookings with 100 distinct booking UIDs,
in addition to the four original demo records. A second import preserved those
counts. Only aggregate counts were inspected for this report; customer record
contents and credentials are absent from this document.

OAuth authorization, API token use, remote webhook registration, history import
and repeated-import behavior are now verified. Refresh-token renewal and remote
webhook event delivery remain unverified. A public unauthenticated POST to the
registered preview webhook route returned 403 with "This preview only accepts
same-origin requests." This is a Conductor preview-edge limitation. Native
manual sync and six-hour API reconciliation remain available; a publicly
reachable webhook endpoint is required for real-time deliveries.

Authenticated browser automation of metadata mutations must send
`x-twenty-session-cookie: 1`, matching ApolloFactory's normal cookie opt-in.
The first direct fetch omitted it and was correctly rejected as unauthenticated;
no credentials were extracted to work around that rejection.


## Per-Connection Sync Settings

Implemented the controls approved in [decision 0003](../decisions/cal-com/0003-per-connection-sync-preferences.md).
The app exposes **Sync Settings** in its workspace settings and a global
**Configure Cal.com** command. An authenticated route loads and saves per-account
preferences and validates native caller permissions. Private accounts are filtered
by owner; shared writes require Applications permission. Mapping targets are
validated against writable, non-unique custom Text fields on Cal.com Bookings.

The worker applies watched event types, a fixed per-run history anchor, optional
Person creation, answer selection and answer mappings. Settings revisions stop
old queued pages. Pause is enforced for scheduled jobs, webhook dispatch and
manual sync. Settings changes never delete records. Status is recorded per
connection, including success timestamp and failure details. Defaults remain all
links/all history, existing contacts only, all answers, no mappings, unpaused.

During live verification, older bookings returned null event type IDs for deleted
links. The schema now accepts null IDs; all-links mode imports these bookings,
while selected-link mode excludes them. This is covered by a regression test.

Verification: 38 unit tests, direct TypeScript checks and lint pass. Browser tests
loaded eight event types, saved no watched links, a 30-day history window,
selected answer keys and pause, reloaded to confirm persistence and confirmed
Sync Now was disabled. Those temporary choices were restored to the original
defaults before running the normal sync. Optional contact creation and mappings
were checked with tests; no real account was opted into creating People or
mapping answers as part of verification. The preview host and external webhook
limitations described above still apply. No production change was made.

The final live manual sync reports Success with 100 synced bookings and a fresh
success timestamp. Database verification still reports 100 distinct real booking
UIDs plus the four original demo rows. There are no active sync errors. The form
was inspected in light and dark mode in the native app settings page; the demo
workspace member's theme was restored afterward. Screenshots are private preview
artifacts at `.context/cal-com-settings.png` and
`.context/cal-com-settings-dark.png`. Live API calls during these checks used the
already connected account for event-type reads and the authorized booking sync;
no bookings were created, cancelled or rescheduled in Cal.com.

## Preview Settings 401 After Restart

On 2026-11-21 the owner supplied a screenshot showing HTTP 401 for the settings
request while the native Twenty UI was authenticated. Earlier VM-local TLS checks
bypassed Conductor's edge and did not cover this failure mode.

Source verification found that `createHostFetchEnforcingPolicy` intentionally
omits ambient page cookies for `/s/` routes. This protects session and gateway
identity headers from being forwarded to app handlers. Cookies are allowed on
native `/rest/` API requests. Do not broaden that renderer policy to repair this
preview.

The current preview is exposed on **port 3002**, served by the private
`.context/cal-preview-proxy.cjs`. Its two exact `/rest/preview/cal-com/settings`
and `/rest/preview/cal-com/sync` routes forward to the corresponding local `/s/`
handlers. Before forwarding, the proxy keeps only the app Authorization,
Content-Type and Accept headers plus the public Host/protocol. Cookie, session
opt-in and gateway identity headers are removed. App-route Set-Cookie responses
are also removed. Other requests proxy to the existing server on port 3000,
including WebSocket upgrades.

Only an ignored `.context/cal-com-preview` fixture changes those two frontend
request paths; production app source and host renderer policy are unchanged.
The fixture was built and applied without pruning. Future app edits must be
copied into that fixture before applying it, with those two request-path changes
preserved, or the preview will regress to `/s/` requests. The original app source
still works directly on a host without this additional preview gateway.

Validation used the real renderer in a browser behind a VM-only TLS gate that
requires an HttpOnly page cookie. Settings load and same-value save returned 200,
the saved preferences were identical, and an otherwise identical request without
an app bearer token returned 403. Proxy isolation checks confirm cookies and
identity headers do not reach the app route. No browser page errors occurred.
The owner's already-authenticated public Conductor browser was not driven by
this test; a full page refresh loads the new fixture. Anonymous public requests
still encounter Conductor authentication.

The existing connection, preference set and 100 real bookings were retained.
The proxy and Docker processes survive tool execution. Its startup attempts to
restore Docker if stopped, but VM wake behavior was not newly verified.
The public URL is unchanged. Local TLS port 3443 now forwards to port 3002;
port 3444 is the private cookie-gated verification listener. Screenshot:
`.context/cal-com-settings-gateway-fixed.png`.


## Attendee-To-Person Creation Permission Fix

On 2026-11-21 Kareem asked: "are atendee's not auto-mapped to people recs?"
Inspection confirmed that Create Missing People had been enabled, two event types
were selected, and the last sync had failed with a permission error. None of the
100 imported first-attendee emails matched an existing Person's primary email.

The role already granted Person creation, but scoped app tokens derive creation
rights from the legacy write grant in the runtime role-scope adapter. The sync
role now grants the Person write permission alongside creation. App code still
only creates missing People; it does not update existing People's names or emails.
The same fix was applied to the preview fixture without pruning, changing the
owner's watched links or resetting any settings.

Re-running the worker with the owner's saved settings succeeded: 39 bookings
from the two selected links are linked to 28 distinct People. Repeated attendee
emails are not linked to multiple Person IDs. All 100 imported booking records
remain present. TypeScript, lint and 38 tests pass; the live native app-role
execution verifies the previously failing creation path.

Matching still covers the first attendee and the Person's primary email only.
Secondary email addresses and additional guests are not matched. Bookings outside
the saved watched-link/history selection are preserved without being reprocessed.
All inspection and documentation use aggregate counts; no customer records or
credentials are included here.


## Production Release

On 2026-11-21, [PR #16](https://github.com/fundlevel-digital/twenty/pull/16)
merged as `a07620c917d9b2df5c036df9c58665b7c623fe1a`. Direct TypeScript,
app lint, SDK build and 38 behavior tests passed before release. The production
package was installed with SDK/CLI 2.59.0 from that merged commit, using the
owner's saved native CLI authentication. The Conductor proxy fixture was excluded.

The initial production apply created 137 metadata entries, updated/deleted none,
and reported no destructive changes. A subsequent plan reported zero changes.
The installed application is `4cf5da81-7345-405c-8631-0e05e1204b96`, with
registration `4616fe48-76bd-4bde-9dc6-cdfdd1bbc83d` on
`https://crm-login.fundlevel.co`. Ten logic functions, the six-hour reconciliation
schedule and the booking GraphQL schema were verified. No core image deployment
or production database reset was required.

The production webhook handler is publicly reachable: a request with an unknown
connection returns its expected 404 response. The authenticated settings route
returns 200 directly at `/s/cal-com/settings`; no preview routing workaround is
needed in production. This establishes endpoint reachability, not signed delivery
from Cal.com.

Kareem reported: "Configured live credentials and connected". A native metadata
query selecting only credential keys and `isFilled`/`isSecret` confirmed both
live OAuth variables are filled. At 23:38 UTC, the settings API and read-only
aggregate queries across both Cal.com providers still found zero saved live
connections; the booking count was zero. The owner was asked whether Add
Connection completed and whether the Cal.com client contains the live callback:
`https://crm-login.fundlevel.co/auth/apps/callback`. No secret values were read,
transferred or recorded. Live consent, registration of its Cal.com webhook and
initial import remain pending verification.

The preview connection and saved watched-link/contact preferences are isolated;
they are not copied into production. A new connection defaults to all links,
all history and matching existing People, with missing-Person creation disabled.
After connecting live, review **Configure Cal.com**, save the desired links and
contact preferences, then run **Sync Now**. Existing imported records are never
deleted when the selection changes.
