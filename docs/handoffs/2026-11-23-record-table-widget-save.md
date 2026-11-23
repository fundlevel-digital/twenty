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
installed and the shared package rebuilt. Three committed Jest regressions pass:
partial-save retry, reuse of a loaded view, and creation failure propagation.
Lint, full typecheck and the release build are being verified. The earlier
isolated harness remains private evidence under `.context/widget-save-check/`.

The owner authorized completing the live fix in [decision 0009](../decisions/0009-fix-live-dashboard-save.md).
At this source commit, production inspection remains read-only; image build and
release are pending. The existing CLI session was renewed through the supported
CLI refresh flow, with credentials retained on the Mac.
Hindsight recall was unavailable because the VM lacks the private profile;
remote memory retention is not claimed.
