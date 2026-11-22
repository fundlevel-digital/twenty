# Related Value Chips

Kareem rejected the adjacent-text related-value display and supplied an Attio
screenshot with separate value chips and source avatars. The
[decision and exchange](../decisions/related-columns/0003-source-record-chips-for-related-values.md)
extend the [multi-step preview](2026-11-22-multistep-related-columns.md).

## Change

Multi-value lookup cells use the existing Twenty outline/round Chip, Avatar,
record side panel and OverflowingList. Each chip renders the existing field
formatter, retaining number/date/currency and other type-specific formatting.
The source record's avatar identifies the value, its name appears on hover, and
its avatar opens that record. Avatar controls use the existing mouse-down
navigation hook, including keyboard activation, so the table hover portal does
not swallow the first click. A native Tooltip identifies the source on hover. Overflow uses a visible +N control with the native
expanded list. No shared primitive, variant or CSS override was added. Browser testing found
that the shared OverflowingList measurement could count a partially fitting last
chip as visible while still showing overflow, producing a +0 control that could
not expand. Its measurement now counts complete chips, preserving truncation of
an oversized first chip. This shared correction is covered by regression tests
and affects the existing chip lists using that control.

Source identity comes from the one multiple-record step. For a configured
many-to-many junction it comes from the related object beyond the linking row.
Each source/leaf pair appears once; different people sharing one Location keep
two city chips. Equal city text also stays separate when related records differ.
The record store still deduplicates terminal records independently. This refines
the earlier preview's leaf-only display semantics; no CRM records were rewritten.

The query selects readable source label/image fields at the appropriate path
level, including when the multiple-record relationship occurs after a single
step. Permission checks, empty-value filtering, zero values, the path cutoffs,
read-only behavior and existing filter/sort restrictions remain in place.

Source is under `packages/twenty-front/src/modules/object-record/`:

- `record-column-lookup/utils/getLookupRecordEntries.ts` preserves source/leaf
  identity through nested arrays and GraphQL connections.
- `getLookupSourceHopIndex.ts` locates source identity and skips configured
  junction rows. `addLookupTargetsToRecordGqlFields` adds readable identifiers.
- `LookupValueRecordsContext`, `RecordTableCellLookupPathFieldContext`,
  `LookupMultipleValuesFieldDisplay`, `LookupValueChip` and `FieldDisplay` pass
  the source and use the native chip/list components.

## Preview And Verification

The existing isolated VM preview and synthetic example views are preserved.
Primary view: [Team Cities](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000002).
The source frontend uses the optimized-build supervisor, API backend and worker
already described in the preceding handoff. No production rollout or external
API batch is part of this change.

66 focused tests across 14 suites passed. New cases cover shared locations,
source identity before/after single steps, configured junctions, duplicate links,
empty paths, zero values, source hop selection and readable identifier fields.
Direct frontend and UI-library TypeScript passed. Type-aware lint is clean across
changed frontend files and the two shared UI files. The OverflowingList tests
passed 21 cases, with two pre-existing conformance cases skipped. New regression
cases cover the +0 failure, reserved count space, fitting chips and one oversized
chip. The shared library and optimized frontend were rebuilt from this checkout and
installed in the existing supervised preview. Native browser checks confirmed:

- Separate name/city chips with matching source avatars and no +0 controls.
- Two people sharing a Location retain two London chips with distinct avatars.
- +N opens the complete country list, including each person's source control.
- Hovering a source avatar shows its name. Clicking it opens that person's
  record; the fixture's corresponding projects verified the selected source.
- Later many steps use Project/Person identity; configured junctions use the
  related Company identity rather than link-row identity.
- A zero subscriber count remains visible; unknown values remain empty.
- No browser JavaScript errors. Backend and frontend-proxied health checks pass.

The native table renders a separate hover portal. Browser interaction checks
waited for that hovered control before clicking it, rather than targeting the
underlying static copy. Verification uses the same HTTPS origin via the VM-local
TLS proxy and Chrome host mapping, bypassing Conductor's authenticated edge.
Screenshots are `.context/related-value-chips-dark.png`,
`.context/related-value-chips-overflow.png` and
`.context/related-value-chips-source.png`. Native Light and Dark preferences were
saved and verified in the real table, with the original Dark preference restored.
The light screenshot is `.context/related-value-chips-light.png`.
Final direct frontend TypeScript passed after the avatar interaction changes;
the final component's type-aware lint also passed. All source changes remain
local and running in the VM preview; not committed, merged or deployed to production.

The preview reuses its previously compiled message catalogs: this update adds no
new translated UI strings. Generated catalog changes are excluded from git.
Hindsight remains unavailable because this VM lacks the private profile; no
external retention is claimed.

## Full Chip Opening And Picker Row Correction

[Decision 0004](../decisions/related-columns/0004-open-full-chips-and-fix-picker-rows.md)
records Kareem's request to open the related records and his overlapping-picker
screenshot. The full chip now opens its source record, with Enter/Space keyboard
activation and an accessible source description. Formatted values keep their own
nested links/controls. Workspace Member records retain the native restriction on
opening an unavailable record page. The chip keeps its existing appearance.

The Chats picker reproduced the overlap: disabled rows were 32px high while their
labels occupied 68px. The scrolling Dropdown group was shrinking its children.
Its immediate children now retain their natural height; no local CSS override or
new component API was introduced. Actual disabled row heights are 84px, their
labels fit inside their bounds, and successive rows do not overlap.

The shared library and optimized frontend were rebuilt from this checkout and
installed on the existing VM preview. The native browser verified opening from
name text, city text, chip padding, keyboard Enter and an overflow chip. The
person's corresponding fixture fields verified the chosen source. The exact
Chats menu from the screenshot passed height/overlap checks in light and dark
mode; the original Dark preference was restored. No browser JavaScript errors
occurred. The 20 Dropdown tests passed, direct frontend TypeScript passed, and
type-aware lint of the changed component passed. Whitespace checks and the
backend/frontend-proxied health checks passed. Catalog artifacts were restored;
no generated translation changes remain in git.

Screenshots: `.context/related-full-chip-open.png`,
`.context/related-picker-rows-fixed.png`, `.context/related-picker-rows-light.png`
and `.context/related-picker-rows-dark.png`. Browser origin checks still use the
VM-local TLS mapping rather than Conductor's authenticated edge. Preview
supervisors and synthetic data are preserved. No production rollout was done.
