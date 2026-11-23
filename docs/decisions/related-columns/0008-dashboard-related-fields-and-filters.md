# 0008. Related Fields In Dashboard Tables

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Multi-Step Columns](0002-multistep-paths-and-preview-cases.md)

## Context

Dashboard table field settings could display existing related columns but did
not offer the related-attribute picker. Creating a column through the widget
callback also discarded its lookup identity and path.

## Exchange

- 2026-11-23 Kareem: "we shipped relation fields a bit ago, but I'm not able to select them in the dashboard tables"
- 2026-11-23 Kareem: "Please implement that;"
- 2026-11-23 Kareem: "spin up a preview"
- 2026-11-23 Agent: traced dashboard field selection and persistence; found that the existing advanced filter supports a source relation followed by a related record relation.

## Decision

Support related-field selection in dashboard tables. The requested filter case
starts from Contracts and selects records whose Production relates to a selected
Deal. Reuse native Twenty controls and dashboard Save/Cancel behavior.

## Consequences

The Fields menu gains Related Fields using the existing multi-step lookup
picker, feature flag and cardinality/depth limits. Newly added columns preserve
their identity, target and intermediate path in the widget draft and save input.
Related columns can be reordered, hidden and restored. Related-target filter
changes participate in the widget refresh signature.

The existing filter path is Filter → Production → Deal → Is → select a Deal.
This is one relation traversal followed by a foreign-key comparison. Arbitrary
multi-step scalar filters and multiple-record relation filters remain outside
this implementation. The follow-up authorizes an isolated VM preview using synthetic data. It does not authorize a production rollout.

## Evidence

Implementation is in the dashboard record-table settings, widget field callbacks
and widget view-load signature under `packages/twenty-front/src/modules/`.
Verification: 16 frontend tests passed across six focused suites (native picker,
draft creation and editing, save serialization, related-record filter selection,
filter persistence and widget refresh). The shared filter suite passed 73 tests,
including relation-target foreign-key filtering. Type-aware lint passed for all
12 changed/new TypeScript files; formatting and diff whitespace checks passed.
Shared runtime/declarations and Twenty UI were built directly after Nx graph
initialization stalled in this fresh checkout. No server schema or migration
changes were required. The full frontend TypeScript check (`tsgo -p tsconfig.json --noEmit`) passed
after building the client SDK, SDK and component-renderer declarations.
The authenticated production dashboard could not be opened from the web tool;
its saved configuration has not been changed.

The isolated [preview handoff](../../handoffs/2026-11-23-dashboard-related-fields-preview.md)
records the synthetic Contracts → Production → Deal example, fresh-session login
autofill, and native picker/Save/reload verification. No production changes were
made.
