# 0009. Group Dashboard Tables By Single-Value Relation Paths

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Dashboard Related Fields](0008-dashboard-related-fields-and-filters.md)

## Exchange

- 2026-11-23 Kareem: "THat looks okay."
- 2026-11-23 Kareem: "Can u also make it so that I'm able to group by relation fields, and nested relation fields?"
- 2026-11-23 Kareem: "Basically, i wanna be able to group byt whatever our relation fields let us get."
- 2026-11-23 Kareem: "Maybe it makes sense to limit grouping to relation values that only end on One value; and not the ones that end on multipel/array of values ykim?"
- 2026-11-23 Agent: interpreted the cardinality boundary as at most one value per source record: every relation step must be Belongs to One. Reused native group headers, record chips and tables.

## Decision

Extend dashboard table grouping to direct related records, nested related
records and their supported scalar attributes. Group related records by identity;
group a selected attribute by its value. Exclude paths crossing Has Many and
array/Multi-Select leaves. Empty relations share a No Value group.

The existing five-relation-hop limit remains an engine constraint. Composite
fields expose their supported scalar subfields. Existing Select grouping remains
available. This request authorizes implementation and updating the isolated
preview, not production changes.

## Implementation

Persist field IDs and optional composite subfield in the record-table widget's
existing JSON configuration. No database migration is required. Backend grouping
parses and joins bounded single-record paths. Dynamic groups reuse native table
queries with a group condition combined with the view's filters. Group discovery
runs on the server, with Load More for additional groups; record pages within
each group use the normal table pagination.

## Evidence

The [session handoff](../../handoffs/2026-11-23-dashboard-relation-grouping.md)
records fifteen frontend tests, seventy-three server tests, frontend types,
lint, source builds, live aggregate checks and saved-dashboard browser checks.
Full server type analysis exceeded the VM memory limit and remains incomplete.
Implemented and preview-verified in the workspace; not merged or deployed to
production.
