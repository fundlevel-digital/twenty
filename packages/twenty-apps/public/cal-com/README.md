# Cal.com For Twenty

A native Twenty SDK app with personal and shared-workspace Cal.com OAuth
connections. Imports bookings into **Cal.com Bookings**, links the first attendee
to an existing Person by primary email, and links an existing Calendar Event by
its exact iCalendar UID. It never creates duplicate calendar events.

## Features

- OAuth authorization and token refresh use Twenty's native connection system.
- Connection hooks register signed webhooks and enqueue a paginated history import.
- Created, requested, cancelled, rejected, rescheduled and reported no-show events
  enqueue a fetch of current booking state. Repeated and late deliveries converge
  on one record per Cal.com booking UID.
- Every six hours, reconciliation walks bookings again to recover missed changes
  and link contacts or calendars that appeared after the original import.
- Booking answers, host, attendee, location, source timestamps and reschedule UIDs
  are preserved. Opportunities can be linked manually.
- **Sync Cal.com Bookings** is available in the command menu. Workflow and AI tools
  also expose **List Cal.com Bookings** and **Get Cal.com Booking Links**.
- Tools select the requesting user's personal connection first, then a shared
  workspace connection. They never select another user's personal connection.
- Disconnect stops future jobs and deletes the registered remote webhook while
  preserving imported booking history.

## Per-Account Sync Settings

Open **Settings → Apps → Cal.com → Sync Settings**, or use **Configure Cal.com**
in the command menu. Choose the connected account first.

- **Booking Links:** watch all links or select specific event types. An empty
  selection imports nothing. Bookings whose event type was deleted are included
  only when watching all links.
- **Import History:** all history, future bookings, or the last 30/90 days plus
  future bookings. A sync uses one fixed time anchor across its pages.
- **Contacts:** match existing People by primary email. **Create Missing People**
  opts into creating a Person for an unmatched first attendee; ambiguous email
  matches remain unlinked. Names and emails on existing People are preserved.
- **Booking Answers:** store all answers, selected answer keys, or no answers in
  the Booking Answers field. Selection changes that field on subsequent syncs.
- **Answer Mappings:** map original answer keys into writable, non-unique custom
  Text fields on Cal.com Bookings. Create those fields in Data Model, then reload
  settings. Mappings update those fields during sync independently of answer
  storage. Removing a mapping preserves its previously saved target values.
- **Sync Controls:** pause/resume, Sync Now, Refresh Status, last success and last
  error. Save Preferences before syncing. Scheduled reconciliation is six-hourly.

Changes never delete existing bookings. Records outside the selected links or
history window remain as they were. Queued pages are bound to a settings revision
and stop after settings change; paused accounts also stop webhook and scheduled
imports. Preferences are checked again before each booking write.

Personal accounts are visible only to their owner. Shared settings require the
native Applications permission to change, and personal settings require Connected
Accounts permission. The backend checks identity and permissions independently
of the UI. Saving preferences does not automatically run an import.

Defaults preserve the original app behavior: all links, all history, match
existing People only, all answers, no mappings, sync enabled.

## OAuth Setup

1. Create a confidential client at [Cal.com OAuth Settings](https://app.cal.com/settings/developer/oauth).
2. Register the exact callback URL: `https://<twenty-origin>/auth/apps/callback`.
3. Request `BOOKING_READ`, `EVENT_TYPE_READ`, `PROFILE_READ`, `WEBHOOK_READ`,
   and `WEBHOOK_WRITE`. Cal.com reviews new OAuth clients before activation.
4. In Twenty, open **Settings → Developers → Apps → Cal.com → Config →
   Server Variables**. Set `CAL_COM_CLIENT_ID` and secret `CAL_COM_CLIENT_SECRET`.
   These are the external Cal.com credentials, distinct from the registration's
   OAuth tab for clients accessing Twenty. Do not store them in this repository.
5. Install the app, then add a personal Cal.com connection in App Preferences or
   a shared connection through the app's workspace settings. The exact entry
   depends on the host Twenty version.

The preview callback is
`https://fundlevel-w923.conductor.show/auth/apps/callback`.
Suggested registration name: **Cal.com For Twenty Preview**. Client type:
**Confidential**. Website: the preview origin above. Select these scopes:

```text
BOOKING_READ
EVENT_TYPE_READ
PROFILE_READ
WEBHOOK_READ
WEBHOOK_WRITE
```

The owner has configured the preview client ID and secret privately in Twenty.
The native Connect flow reaches Cal.com sign-in with the expected callback and
scopes, with PKCE disabled. Credentials are absent from source files. Account
sign-in, token-authenticated API access, webhook registration and import of
100 bookings are now verified. Token refresh and remote webhook delivery remain
unverified.
Conductor's edge rejects external webhook POST requests with HTTP 403 (same-origin
policy). Manual sync and six-hour API reconciliation work; real-time delivery
requires a publicly reachable endpoint. Local browser verification bypasses that
edge.

## Development

This app is an independent Yarn project using SDK and CLI 2.59.0:

```sh
cd packages/twenty-apps/public/cal-com
yarn install --immutable
yarn typecheck
yarn lint
yarn test
yarn twenty app build
```

Use a dedicated preview CLI remote, plan changes, then apply them. Server, worker,
PostgreSQL and Redis are required. The app's SDK discovery entry points use the
SDK-required default exports, matching sibling apps.

## Current Scope

Personal event types and bookings are supported. Organization/team-wide scopes
and team-level webhooks are not configured. Attendees are retained in Cal.com;
the CRM record links the first attendee only. Contact creation is optional and disabled by default. Booking
creation/cancellation/rescheduling from Twenty are not implemented.
Native scheduling links remain available through the workflow/AI tool.
Ambiguous contact or calendar matches remain unlinked. The app does not infer
opportunity associations or meeting attendance from elapsed time.

## Verification

The isolated preview uses the published Twenty 2.59.0 Docker host and its bundled
frontend, not a build of the host frontend in this checkout. Four synthetic
bookings exercise accepted, cancelled, rescheduled and no-show states. Tests
cover signature validation, source timestamp ordering, reschedule/no-show mapping,
ambiguous matching and concurrent updates. The real preview database was also
used to verify create/update, stale replay protection and contact/calendar links.
The bundled preview host exposes the shared-workspace connection card. Its older
frontend does not expose the newer personal App Preferences routes in this
checkout. Preview OAuth authorization, webhook registration and a 100-booking import are
verified. A repeated import retained 100 distinct real booking UIDs. Token refresh
and external webhook delivery remain unverified; the preview edge rejects
external POSTs.

## API References

- [OAuth](https://cal.com/docs/api-reference/v2/oauth)
- [Webhooks and signatures](https://cal.com/help/webhooks)
- [Booking list, API version 2026-05-01](https://cal.com/docs/api-reference/v2/bookings/get-all-bookings)
- [Booking detail, API version 2026-02-25](https://cal.com/docs/api-reference/v2/bookings/get-a-booking)
- [Event types, API version 2026-06-12](https://cal.com/docs/api-reference/v2/event-types/list-event-types)


### Preview Gateway Routing

Conductor requires its browser sign-in cookie, while the SDK deliberately omits
page cookies on `/s/` app routes. This preview therefore uses a private proxy on
port 3002 and an ignored app fixture whose settings/sync requests use two exact
`/rest/preview/cal-com/` endpoints. The proxy strips cookies and identity headers
before forwarding to the authenticated app handlers on port 3000. Production
source and the SDK isolation policy are unchanged. See the session handoff for
fixture and restart details. After an update, refresh the full page to load the
new frontend bundle.


### Contact Creation Permissions

The sync role includes the legacy Person write grant because scoped app tokens
still derive creation permission from that grant. Actual sync code creates
missing People only when enabled; it never updates existing People's names or
emails. Preview verification with the owner's two selected links linked 39 bookings
to 28 People without assigning repeated emails to multiple Person records.


### Production Installation

[PR #16](https://github.com/fundlevel-digital/twenty/pull/16) is merged, and the
app from commit `a07620c917d9b2df5c036df9c58665b7c623fe1a` is installed at
`https://crm-login.fundlevel.co`. Live OAuth, webhook registration and booking
imports are verified. At 23:43 UTC on 2026-11-21, the latest sync succeeded;
100 booking records were present, with 97 linked to People. The owner selected
three booking links and enabled missing-Person creation. Signed webhook delivery
and token refresh remain unverified. See the
[release handoff](../../../../docs/handoffs/2026-11-21-cal-com-preview.md#completed-live-connection-verification)
for deployment evidence and verification details.

## Native Enum Field Upgrade

Categorical attributes use native Select/Multi-Select fields. This upgrade adds
typed fields for earlier text categories and keeps the old raw values and field
identifiers for compatibility. Imports populate the typed values; the shared
[backfill CLI](../../operations/README.md) fills existing records without provider
calls or overwriting selections. Review a dry run after installing the updated
metadata. Source/preview verification does not imply production deployment.
