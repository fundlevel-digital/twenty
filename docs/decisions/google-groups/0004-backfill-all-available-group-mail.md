# 0004. Backfill All Available Group Mail

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Google Groups; Fundlevel preview
- Related: [Preview scope](0003-preview-google-groups-in-fundlevel.md), [handoff](../../handoffs/2026-11-22-fundlevel-google-groups-preview.md)

## Context

The owner connected Google, configured three Group channels and ran an initial
30-day import. After seeing the same sent email under native Gmail and the app,
he requested incoming Team examples and the entire history.

## Exchange

- 2026-11-22 Kareem: "But I didn't send both? Shouldn't it show ops@fundlevel.co?"
- 2026-11-22 Kareem: "Also I think I got some emails TO team@fundlevel.co - would love to see how those look, please sync eeverything for me"
- 2026-11-22 Kareem: "Like backfil the ENTIRE HISTORY"
- 2026-11-22 Agent: committed to All History for the configured Groups in the
  isolated Fundlevel preview, preserving the contact policy and explaining that
  this Gmail connector cannot read messages held only in a Groups archive.

## Decision

Set the existing preview app to All History and process every backfill page for
its configured, enabled Groups. This authorizes the necessary Gmail API reads
and preview message, attachment and contact imports. Preserve the owner's
Everyone contact policy and channel configuration. Production deployment,
outbound messages and an import into the live CRM are outside this request.

## Evidence

The native settings save returned `historyDays: all` with a fresh revision.
The initial batch succeeded; the next page exposed a missing file-upload role
permission. The source role fix adds only `SystemPermissionFlag.UPLOAD_FILE`.
Its preview apply created one role-permission assignment, with zero updates or
deletions. Subsequent attachment fixes passed 57 tests, typecheck and lint, and
were applied to the preview. The completed backfill accounted for all 353 Gmail
candidates in 372 Group-scoped entries and 124 attachments; a subsequent
incremental sync was idle with no error. The handoff records counts, dates,
preview routing adjustments and verification limits.
