# Platform Related Fields And Grouping

Related fields are available in the Fields controls for record tables, lists,
boards, calendars, dashboard tables and record-page relation widgets. They use
the existing related-value rendering, including permission checks and source
chips for multiple values. The lookup rollout flag and layout restriction no
longer prevent selection or hide saved fields when switching layouts.

Group By controls in record views, dashboard tables, record-page widgets and
pie/bar/line chart dimensions expose the same native Related Fields path picker.
Grouping allows up to five single-record relation steps and a supported scalar
or related-record identity. Has Many paths, arrays and Multi-Select leaves are
disabled. Calendar keeps its native date layout and receives related display
fields. This change does not introduce related chart measures or nested sorting
in ordinary record views.

## Shared Implementation

Views save the root in `mainGroupByFieldMetadataId` and the path in the new
nullable `mainGroupBySubFieldName`. The property is preserved by view creation,
cloning, overrides, widget drafts and application manifests. The generated fast
instance command adds the column; it was applied only to the isolated preview.
The earlier dashboard-only JSON grouping remains compatible, while new choices
use shared view settings.

Group discovery runs server aggregates, loads twenty groups at a time and merges
saved group order/visibility. Grouped rows use nested filters; missing intermediate
relations join the No Value group. Date values respect the user's timezone.
Projection groups disable drag-to-reassign and create-in-group actions because
those actions cannot safely write the derived value onto the source record.
Other source fields retain their ordinary editing behavior.

Table, list, board and calendar loaders share related-record store hydration.
Subscriptions refresh rows, cards and aggregates when source or related records
change. Chart queries validate every hop, build nested grouping and order inputs,
resolve record labels and format values using the terminal field's metadata.

## Preview And Verification

The source-built frontend, backend and queue worker run against the isolated
synthetic preview at https://fundlevel-w945.conductor.show/ . The Platform tab on
the existing demo dashboard contains a related Deal pie chart and a table using
the shared view grouping. Contracts also has Related Table, Related List,
Related Board and Related Calendar views. Existing demo tabs are preserved.

Frontend TypeScript and type-aware lint passed; server lint and scoped server
TypeScript passed. Full server TypeScript was killed by the VM's memory limit,
including attempts with the app processes stopped. The backend and optimized
frontend source builds passed. Translation extraction/compilation was used for
the preview build; source catalogs were restored afterward.

The broader test selection covered 164 frontend tests and 430 server tests.
One expected-settings fixture and one manifest export fixture initially needed
the new nullable view property; both passed targeted reruns after correction.
Eight loading regression tests subsequently passed, including shared nested
related-record hydration.

Browser checks verified:

- Table, list and board render five synthetic contracts in the expected related
  Deal groups (two, one and two with missing relations).
- The native Group By picker saves a nested scalar path and restores it on
  reload. A board with only one relation root also keeps the picker enabled:
  selecting both a nested scalar and a nested record identity saves and reloads
  correctly. Long selected paths use the native row's description below its
  label, and projection groups omit the New Group action.
  The native Fields picker adds a related scalar in List and restores
  its values on reload. Calendar cards render the nested Deal name.
- A shared-view dashboard table saves nested scalar grouping through its settings
  panel and reloads with the grouped records. The final source-build smoke test
  also verifies the earlier dashboard JSON grouping still renders all five
  records, and reports no uncaught browser errors.
- Hiding a discovered scalar group creates its saved definition, survives reload,
  hides the matching records and retains records with missing intermediate
  relations. The test restores group visibility afterward.
- Changing a Production's Deal moves its contracts to the new board column and
  refreshes lookup values without reloading. Restoring the relation restores
  group membership.
- Fresh login succeeds with both demo credentials already filled. Native Dark
  and Light appearance settings render the grouped board; Light is restored.

Chart API checks verified pie, bar and line labels/counts, ordered nested
relation identities, and primary/secondary axes sharing a root at different
relation depths. Counts are two, one and two unset. An additional 42 server
tests passed for grouping order, nested filtering and relation permission query
surfaces. Regression cases traverse five repeated self-relation names with
unique aliases and reject a sixth hop. Native filter validation now shares the
five-step bound needed by nested scalar group rows.

The new record-page relation-widget Fields entry is implemented in its dedicated
settings panel and covered by the shared picker/draft paths; the browser run
exercised the dashboard settings panel. The default synthetic record page uses
the legacy Fields layout rather than a relation-table widget.

The browser uses the public hostname mapped to the VM's local TLS proxy, so it
verifies the public-origin configuration while bypassing Conductor's authenticated
edge. An anonymous edge request returns its expected authentication gate.

No production deployment, commit or PR was made. Hindsight memory could not be
accessed because the VM lacks its private profile; the verified handoff and
[owner decision](../decisions/related-columns/0010-platform-wide-related-fields-and-grouping.md)
remain in the repository.
