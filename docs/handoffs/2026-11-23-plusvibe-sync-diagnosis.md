# PlusVibe Sync Diagnosis — 2026-11-23

Kareem reported missing data while reviewing native outreach dashboards and
clarified that PlusVibe Senders means owned historical inboxes. See
[decision 0016](../decisions/packages/twenty-apps/public/plusvibe/0016-senders-are-owned-historical-inboxes.md).

## Verified Live State

Authenticated reads through the existing CLI remote on the owner's Mac found:

| Check | Result |
| --- | --- |
| Source connection | Connected, no account error |
| Selected source workspaces | One, Fundlevel |
| Import checkpoint | Version 4, Failed, failed phase Leads |
| Checkpoint updated | 2026-11-23 05:59:59.790 UTC |
| Processed counter | 6,666; this is checkpoint work, not the total CRM Lead count |
| Failure | Twenty REST PlusVibe Lead write returned HTTP 400 |
| Current checkpoint jobs returned by status | None |
| Email-history failure marker | Present, dated 2026-11-23 06:00:22.545 UTC |
| Twenty PlusVibe Leads | 7,245 |
| Native PlusVibe Messages | 1,480 |
| Native PlusVibe Threads | 807 |
| PlusVibe Senders | 160 |

The owner-supplied PlusVibe screenshot shows 15,814 Total Leads and 11,865 Total
Contacted. These are screenshot evidence, not fresh provider API totals. The
counting basis still needs reconciliation. The import is demonstrably incomplete
independently of that distinction: it is marked Failed in the Leads phase.

Messages and Threads have not increased from the earlier repair handoff's totals.
The earlier targeted repair recovered source Lead/send evidence; it did not
finish full history import. The current failed run has not progressed through
the remainder of lead discovery into the email-history phases.

## Sender Defect

The external sender shown in the screenshot exists in the live Sender object
and has six associated messages. Each message contains that external address
in both FROM and TO participant roles. All six were created on 2026-11-21 and
last updated that day, preceding the later partial recovery. This is persisted
historical corruption, not simply the sender table displaying an unexpected
field. Current sender mappings cannot be assumed reliable.

Source inspection also identified a candidate unsafe fallback in `mapEmail`:
`sender_email` is treated as an owned account before direction-specific headers
are considered. `syncNativeEmail` validates address syntax but does not reject
identical owned-inbox and lead addresses. This is a code-level risk; the exact
historical payload that produced the screenshot's records was not recovered,
so it is not claimed as the proven original cause.

## Remaining Work

- Recover the HTTP 400 response diagnostic and failing source record, then fix
  the rejected write. The checkpoint contains only the generic SDK error.
- Inspect the email-history failure independently; it may have a different cause.
- Complete source Lead discovery and email-history ingestion with reconciliation.
- Establish owned historical inbox evidence, prevent external participants from
  entering Senders, and repair affected participant/channel/sender/link data
  while preserving message identities and content. A sender-only deletion is
  insufficient and was not attempted.

The application event-log API could not supply diagnostics because ClickHouse
is not configured. Current status came from the installed
`plusvibe-settings-status` function, whose execution succeeded. Credentials
remained on the Mac. No import restart, provider-side write, deletion, customer
record repair or deployment was performed by this diagnostic investigation.
Hindsight remained unavailable in this session.
