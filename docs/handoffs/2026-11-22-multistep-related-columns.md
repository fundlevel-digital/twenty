# Multi-step Related Columns

The subsequent [related value chip update](2026-11-22-related-value-chips.md)
refines the display and its source-record identity semantics.

Continuation of the [initial related-column preview](2026-11-22-related-columns-preview.md).
The [owner exchange and decision](../decisions/related-columns/0002-multistep-paths-and-preview-cases.md)
extend that implementation to successive relationship pages.

## Behavior

The native Add Column picker now exposes relationships on each reached object,
alongside its attributes. Selecting an attribute saves the complete path. The
native Back control returns to the preceding page; search applies on each page.
Single-record steps can precede and follow a multiple-record step. A second
multiple-record step stays visible but disabled with an explanation. The same
validation is used for selectable paths and saved lookup columns.

The existing limit remains five stored relationship hops. A configured
many-to-many junction consumes two of those hops and one multiple-record step.
The sixth hop is disabled with a depth explanation. Morph targets and unreadable
relations are excluded. Multi-step and multi-value columns remain read-only,
without sorting/filtering. This work adds no server migration or shared UI
primitive.

Display follows terminal record identity: shared Locations reached through several
people appear once; distinct Locations with equal City text can show repeated
text. Missing relations and missing values stay empty; zero remains a value.

## Preview Cases

The optimized frontend is built from this checkout and served at the existing
VM origin, proxying APIs to the isolated backend. The original Influencers /
YouTube Channels preview remains available. Added data consists of seven demo
Companies, eleven People, four Locations, three Countries, one Continent, one
Hemisphere, one Planet, three Projects and three Company Partnerships. These are
synthetic; no production records or external API batches were used.

Company views filter on the synthetic Lookup Demo flag:

| View | Example | Expected |
| --- | --- | --- |
| [01 Single Record Chains](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000001) | Primary Contact → Primary Location → City; unique Exclusive Contact → Primary Location → City | Atlas Studio: London in each city column |
| [02 Team Cities](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000002) | Team (many) → Primary Location → City | Atlas Studio: London, Paris, Berlin |
| [03 Single Then Many](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000003) | Primary Contact → Projects (many) → Name; Partner Company → Team (many) → Primary Location → City | Atlas Studio: Apollo / Beacon; Paris / Berlin |
| [04 Many To Many Chains](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000004) | Partners (many-to-many) → Primary Contact → Primary Location → City; Partner Company → Partners → Name | Atlas Studio: Paris / Berlin; Cedar Works |
| [05 Empty And Shared Values](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000005) | No Team, no Location, shared Location, distinct Locations with equal City | Empty Studio and Unknown Location Studio blank; Shared Location Studio one London; Repeated City Studio two Londons |
| [06 Five Step Limit](https://fundlevel-w926.conductor.show/objects/companies?viewId=60000000-0010-4000-8000-000000000006) | Primary Contact → Primary Location → Country → Continent → Hemisphere → Name | Atlas Studio: Northern Hemisphere; continuing to Planet disabled |

To inspect the multiple-record cutoff, open Add Column → Team and search Projects.
To inspect the junction cutoff, open Partners and search Team. Both second
multiple-record relationships are disabled regardless of row data. Single-record
choices on those pages remain available. The Exclusive Contact source relation
has a unique constraint; Twenty represents it as a many-to-one metadata relation.

The original preview runtime supervisors, containers and TLS browser harness
remain in use; see the preceding handoff for lifecycle details. VM shutdown
persistence is not promised. Conductor's anonymous edge still requires sign-in;
VM browser testing uses the same HTTPS origin via a local TLS proxy and host
mapping, bypassing that edge.

For a fresh optimized build, run the frontend Lingui extraction and compilation
before Vite. New message IDs otherwise render as hashes in production mode.
English extraction and catalog compilation were run for this preview; generated
catalog churn is excluded from the source changes.

## Validation

- 55 focused tests across 12 suites passed, including the new relationship-path
  options tests for single/multiple steps, junctions, readable fields and depth.
- Direct frontend TypeScript passed. Type-aware lint across 16 changed frontend
  files reported zero warnings or errors. No translation catalog changes.
- Optimized frontend builds replaced the initial preview build. Backend and
  frontend-proxied health checks passed.
- Native browser checks covered all six saved views, including single/unique
  contacts, a many step first/middle/last, junctions first/later, missing values,
  shared leaf records, repeated city text and a five-hop scalar. Atlas Studio
  displays London / Paris / Berlin through Team, Apollo / Beacon through its
  primary contact’s Projects, Paris / Berlin through Partners, and Northern
  Hemisphere through the five-hop chain. No browser JavaScript errors occurred.
- The native picker created Team → Primary Location → Country → Name. Its full
  relation path was independently verified through metadata, and the country
  values survived a browser reload. The demo retains one such column; duplicate
  columns from verification retries were removed from the synthetic view.
- Native picker checks verified Back and keyboard activation, single-record steps
  after a many step, a junction after a single-record step, a second many step
  blocked after both direct and junction relations, and Planet blocked as the
  sixth stored hop. Disabled reasons display as wrapped native descriptions.
- Native light and dark checks verified the table and wrapped cutoff reasons.
  The original dark preference was restored. Screenshots are
  `.context/multistep-cutoff-light.png`, `.context/multistep-cutoff-dark.png`,
  `.context/multistep-team-final.png` and `.context/multistep-depth-disabled.png`.
- The optimized build includes freshly compiled English messages. Generated
  catalogs were restored after building; no translation churn remains in git.

Implementation is local and running in this VM preview; not committed, merged or
rolled out to production. Hindsight memory access is unavailable because this
VM lacks its private profile; the repository records carry the verified context.
