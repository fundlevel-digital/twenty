# Related Attribute Columns And VM Preview

Implementation is local to this checkout. The isolated VM preview uses synthetic
data; no production application or CRM data changes belong to this feature work.

## Behavior

The table's add-column picker offers attributes through many-to-one and
one-to-many relationships, including relations whose record-chip column is
already visible. A configured many-to-many relationship opens attributes of the
terminal object, following its junction internally. The saved view field retains
that target relation path, so reloading can reconstruct the same column.

One-to-many lookups use the existing multiple-value display and store each leaf
record alongside the row. Zero is a value; unknown values and missing relations
stay empty. No implicit total is calculated. Many-to-one lookups retain their
existing behavior. Multi-value/path lookups remain read-only and do not gain
filtering/sorting in this change. Morph targets and paths with multiple list
hops remain outside the current backend lookup contract.

Source is under `packages/twenty-front/src/modules/object-record/`:

- `record-column-lookup/utils/getLookupRelationSelection.ts` resolves selectable
  targets with existing junction configuration and readable-field helpers.
- `RecordTableHeaderPlusButtonContent` and
  `RecordTableLookupTargetFieldSelectMenu` reuse native dropdown pages.
- `getRecordFieldLookupTarget` accepts direct one-to-many targets.
- `useAddRecordTableLookupColumn` and `buildRecordTableLookupColumn` persist
  junction paths; record-store and cell-context helpers display their values.

No new shared visual primitive, styling override, server schema or migration was
introduced. [Decision and owner exchange](../decisions/related-columns/0001-related-attributes-across-relationships.md).

## Preview Runtime

Preview view: <https://fundlevel-w926.conductor.show/objects/influencers?viewId=50000000-0000-4000-8000-000000000001>.
The frontend is an optimized production build of this checkout, served with Vite
preview on port 3001 and proxying API routes to port 3000.
The backend and worker run this checkout's compiled source. PostgreSQL 16 and
Redis 7 have their own VM containers and data, with no production connections.

The synthetic fixture includes five Influencers, five YouTube Channels, and two
Companies linked through an Influencer Brand Link junction. Cases cover a
single channel, two channels, no channel, a zero count and an unknown count.
The dedicated view is **Related Attributes Preview**. The normal development
sign-in is prefilled; the workspace-specific screen may begin with Continue.
No YouTube refresh or quota-consuming API batch was run.

Ignored Python supervisors restart server, worker and the optimized frontend after
a crash and survive command-tool completion. Their PIDs and per-service logs are
under `.context/`; the TLS test proxy has a separate detached process. PostgreSQL
and Redis containers persist during this VM's lifetime. No VM-shutdown wake
mechanism is claimed. The original development frontend is paused; keep
`.context/pause-front` in place while the optimized frontend owns port 3001.

The fresh workspace required dependency installation and rebuilding shared/UI,
client SDK, SDK and renderer outputs before browser verification. The first
parallel TypeScript/lint checks exhausted available memory during cold frontend
compilation; checks were rerun serially after dependencies finished. A private
swap file outside the checkout supports the VM's 8 GiB memory limit. No generated
translation catalog changes were retained. Repeated development dependency
re-optimization also delayed first navigation. The optimized frontend build
completed in 76 seconds and avoids those development-server reloads.

## Validation

The focused lookup suite passed 49 tests across 11 files. Tests include direct
one-to-many resolution, configured junction selection, permission/inactive-field
exclusions, zero-valued record storage and persistence of junction paths. Direct
frontend TypeScript and type-aware lint passed after rebuilding dependencies.

Backend and frontend-proxied `/healthz` checks returned healthy responses.
Anonymous requests to Conductor's public edge require Conductor authentication.
Browser testing uses the exact HTTPS origin through a VM-local TLS proxy and
Chrome host mapping, bypassing that edge. Explicitly disabling the browser's
proxy is required for the host mapping in this environment.

Native browser sign-in completed. From the existing table, the add-column picker
kept both already-visible relations selectable. Selecting YouTube Channels →
Subscribers created a column showing 1,500,000 for one channel, 120,000 and 45,000
as separate values for two channels, 0 for a known zero, and empty values for
unknown subscribers and no channel. Selecting Brands → Name created a saved
junction path and displayed both related brand names. Reloading retained both
columns and all values.

Both light and dark modes were inspected in the real table. Dark mode was changed
through the native Experience settings and its saved preference was verified.
Screenshots are `.context/related-columns-light.png` and
`.context/related-columns-dark.png`. Browser assertions checked individual counts,
zero/empty handling, both brand names and reload persistence.

After the final helper cleanup, its seven focused tests passed again, the direct
frontend TypeScript check passed, and type-aware lint reported zero warnings or
errors. Formatting/diff whitespace checks passed. No production rollout was done.
Repository changes remain local and uncommitted.

Hindsight memory was unavailable because this VM lacks the private profile; no
external memory retention is claimed.
