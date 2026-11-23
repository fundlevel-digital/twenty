# Record Table Widget Save Failure — 2026-11-23

## Evidence And Cause

The affected live dashboard is `c5715902-b655-4ffe-bf95-6e686dde9a0b`,
with page layout `4019e248-fee6-481d-918e-b77a438480ec`. Native API readback
confirmed the screenshot widget and its view ID are persisted in that layout.

Kareem supplied a screenshot showing “Migration execution failed.” and “Failed
to create view for RECORD_TABLE widget” for widget
`041a8747-2768-481e-abd6-cd2891f6a0c6`.

Read-only inspection of the live server logs found a failed CreateView request
at 12:41:42 UTC. PostgreSQL rejected a duplicate primary key for the requested
KANBAN_WIDGET view. A successful view-creation action appears at 12:41:17 UTC.
The screenshot's two messages are the backend's generic migration error and
the frontend's widget-specific wrapper. This is a metadata save failure.

The frontend's pending-view creation hook checked the persisted widget's view
ID but did not skip views already present in the metadata store. A view can be
created successfully before a later part of a layout save fails. Retrying that
save then attempts to create the same view again. This retry failure was
reproduced against the original source; the logs establish the duplicate ID,
but do not establish which earlier step left this particular layout pending.

## Source Change

[useCreatePendingRecordTableWidgetViews](../../packages/twenty-front/src/modules/page-layout/hooks/useCreatePendingRecordTableWidgetViews.ts)
now reuses an existing draft view instead of creating it again. Successful
creates also update the current operation's set of existing IDs. Existing
replacement and removed-widget cleanup behavior is preserved.

## Verification And Release State

A dependency-isolated Node harness executed the actual hook source with mocked
store and persistence boundaries. Six cases passed: retry after successful view
creation with a still-pending layout, preexisting view, replacement, replacement
retry, removed-widget cleanup, and creation failure propagation. The original
HEAD source fails the partial-save retry assertion by issuing two creates.
`git diff --check` passed.

After the owner requested completing the live fix, frontend dependencies were
installed and the shared/UI packages rebuilt. Three committed Jest regressions
pass: partial-save retry, reuse of a loaded view, and creation failure propagation.
Type-aware lint and formatting checks pass for both changed files. Full frontend
`tsgo --noEmit` ran directly; it reports unrelated source/test errors and missing
SDK/renderer/Lodash declarations, with no diagnostics in either changed file.
The earlier isolated harness remains private evidence under
`.context/widget-save-check/`.

## Merged And Deployed

[PR #34](https://github.com/fundlevel-digital/twenty/pull/34) merged as
`e9d29bdb14a5569ba3bcf956a10f5108367f4e83`. The tested source commit is
`27194f251e68c18b3ab44eed9221beeec8593ffd`; the fix and regression test match the
merged files exactly. Its [image build](https://github.com/fundlevel-digital/twenty/actions/runs/45180964426)
passed. The subsequent [main build](https://github.com/fundlevel-digital/twenty/actions/runs/45181848206)
also passed.

Server and worker now use the tested artifact:

- Image: `ghcr.io/fundlevel-digital/twenty:27194f251e68c18b3ab44eed9221beeec8593ffd`
- Digest: `sha256:d914c3dfba5f5ce684bf7487a3aa2f8b43027248979d35413733a0ba8384f24a`
- Prior image remains available for rollback.

The owner authorized completing the live fix in
[decision 0009](../decisions/0009-fix-live-dashboard-save.md).
The supervised cutover reused the established offsite backup and rollback
procedure. Application writes stopped at 13:16:41 UTC; fresh pgBackRest and
restic jobs passed before the new image started at 13:17:50 UTC. Core health and
preservation checks passed at 13:18:18 UTC. No rollback was needed.

Resolved Compose configuration differs only in the server/worker image pins.
Environment hashes, mounts, networks and port bindings are preserved. PostgreSQL
and Redis retain their original containers. APP_VERSION remains 2.61.0;
automatic database migrations and cron registration remain disabled. No schema
migration, app reinstall or CRM record edit was performed.

## Live Verification

- Local, shared-login, Fundlevel and Sunny health endpoints pass.
- All 1,085 public shell-referenced JavaScript/CSS assets load; the public entry
  asset matches its deployed container file.
- The public widget bundle `CommandMenuContextProvider-DmNbCbCv.js` matches the
  container file and contains the compiled existing-view guard.
- Authenticated native API readback confirms all seven saved dashboard widgets
  and their view links match the pre-release fingerprint exactly. Both
  record-table views remain readable, including the view rejected as a duplicate
  in the original failure.
- Final post-release pgBackRest and restic backups passed and all four health
  endpoints passed again. Server is healthy, worker running, database/Redis
  healthy.

The existing CLI session was renewed through its supported refresh flow, with
credentials retained on the Mac. Browser automation was unavailable; no live
browser Save interaction is claimed. The deployed artifact, native metadata and
regression tests were verified. An already-open browser tab must reload to use
the new JavaScript; unsaved browser-only changes were not overwritten.

Private release scripts and evidence remain on the Mac under the directory
referenced by `~/.twenty/.dashboard-save-fix-release-path` and on the production
host under `/mnt/storage/twenty-dashboard-save-fix-20261123`. No credentials or
customer records are included here. Hindsight remains unavailable because the
VM lacks its private profile; remote retention is not claimed.
