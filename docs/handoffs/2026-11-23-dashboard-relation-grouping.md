# Dashboard Relation Grouping Preview

Dashboard tables can group by a related record, a nested related record or a
supported scalar attribute reached through single-record relations. The native
Group By menu exposes a Related Fields path picker. Has Many relations and
array/Multi-Select values are disabled. Each path supports up to five relation
steps, matching the backend bound. Related records group by ID, so identical
display names do not merge distinct records.

Grouping is saved in the existing widget JSON configuration as field IDs and an
optional composite subfield. No database migration is required. Changing the
source or switching away from the table layout clears this configuration.
Existing Select grouping remains available.

## Implementation

The backend validates bounded single-record paths, checks readable fields and
joins the necessary relations. Aliases distinguish repeated relation names and
self-relations. Group discovery uses server aggregates and stable ordering,
with Load More beyond twenty groups. Each group reuses the native record table,
pagination and view filters. Record and relation changes refresh group discovery.

The No Value condition includes missing intermediate relations as well as an
empty leaf. Date-time grouping uses the user's timezone and day boundaries.
Group instance IDs encode values before they enter DOM selectors; regression
coverage includes quoted strings, Unicode, null, false and zero.

## Preview

- Preview: https://fundlevel-w945.conductor.show/
- Dashboard: https://fundlevel-w945.conductor.show/object/dashboard/7dcaaffa-5977-4d03-aee8-a6390ffa06b7
- The Grouping tab uses five synthetic Contracts across three nested Deal groups.
  The original tab retains the saved related filter and related columns.
- The source-built frontend, backend and queue worker use the existing detached
  supervisor. See the [preview runtime handoff](2026-11-23-dashboard-related-fields-preview.md)
  for recovery and the Conductor edge verification boundary.

## Verification

Fifteen frontend tests across six suites and seventy-three server tests across
five suites passed. Coverage includes the native path picker, disabled Has Many
relations, path validation, null/false/zero filters, date-time DST boundaries,
nested SQL grouping and existing filter/order behavior. Frontend TypeScript,
type-aware frontend lint, server lint and both source builds passed. Server lint
ran without type analysis because of the memory limit described below.

Live API checks verified direct related-record grouping, nested related-record
grouping and a nested text attribute. All five Contracts were counted in each
case. The No Value filter returned both the missing Production and missing Deal
cases. Browser checks selected Production → Deal → Demo Deal, saved the
dashboard, reloaded it and confirmed group membership: two matching Contracts,
one other Contract and two No Value Contracts. No uncaught page errors occurred.
Metadata/GraphQL requests aborted by intentional navigation were observed.
Light mode and native Appearance → Dark were checked; changing local storage
alone was insufficient because the workspace member preference overrides it.
The preview account was returned to Light after the dark screenshot.

Screenshots are stored in `.context/dashboard-grouping-light.png` and
`.context/dashboard-grouping-dark.png`. Browser checks use the HTTPS app origin
through VM-local TLS and host mapping, bypassing the Conductor edge. Local
backend and frontend-proxied health checks passed. Demo email/password autofill
was verified during preview setup and remains enabled.

Full server TypeScript analysis exceeded the VM's memory limit and was killed,
including with other app processes stopped. This check remains incomplete.
Generated translation catalogs are restored after building the preview and are
excluded from the change.

## Status

Implemented in the workspace and verified in this isolated preview; not merged
or deployed to production. No production records or paid external APIs are used.
The [owner decision](../decisions/related-columns/0009-single-value-relation-grouping.md)
records the request and cardinality boundary. Hindsight memory remains unavailable
because this VM lacks the private profile; no memory retention is claimed.
