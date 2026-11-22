# 0001. Show Related Attributes Across Relationships

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Computed fields and lookup context](../0001-upstream-and-computed-field-editor.md)

## Context

The Influencers table could show YouTube Channel record chips, but its column
picker did not offer YouTube Channels → Subscribers. The existing picker exposed
related attributes only through plain many-to-one relations. Kareem supplied an
Attio screenshot showing a related Sponsorship attribute on Companies and noted
that Attio permits other relationship cardinalities too.

## Exchange

- 2026-11-22 Kareem: "Why can't I add something like YouTube Channels > Subscribers view here like attio can:"
- 2026-11-22 Agent: identified the many-to-one-only picker and direct lookup resolver restrictions; proposed individual related values for multiple channels, with aggregation separate.
- 2026-11-22 Kareem: "Yeah pleas eubuild this, and setup a preview on ur VM"

## Decision

Build related-attribute table columns across the existing relationship structure,
including direct one-to-many and configured many-to-many junctions. Keep related
objects reachable from the add-column picker after their record-link column is
visible. Multiple related records show individual values, without an implicit
sum. Provide an isolated preview running this checkout on the VM.

## Why

The owner wants to see channel metrics alongside Influencers and explicitly
approved implementing that behavior with a VM preview. Relationship cardinality
should determine the number of displayed values, not hide the attributes.

## Consequences

Reuse the native dropdown and existing lookup path/display infrastructure.
Many-to-many selections persist the junction's target relation as part of the
saved column path. Multiple-value columns are read-only and retain the current
restrictions on filtering/sorting. Morph targets and nested paths with multiple
one-to-many hops remain unsupported by the existing lookup contract.

The preview uses synthetic records, including zero, missing, single and multiple
subscriber counts, and two brand links through a junction. This request does not
authorize a production rollout or copying production CRM data into this VM.

## Evidence

- Implementation: `RecordTableHeaderPlusButtonContent`,
  `RecordTableLookupTargetFieldSelectMenu`, `getLookupRelationSelection`,
  `getRecordFieldLookupTarget`, and lookup persistence/display helpers under
  `packages/twenty-front/src/modules/object-record/`.
- Optimized source frontend build, direct frontend TypeScript, type-aware lint,
  49 focused tests and a seven-test follow-up passed. Native browser checks
  verified adding one-to-many and junction columns, multiple/zero/empty values,
  reload persistence and both themes against synthetic VM data.
- [Preview and verification handoff](../../handoffs/2026-11-22-related-columns-preview.md).
- Implemented in this checkout and running on the VM; not committed, merged or
  deployed to production.
