# 0009. Preserve Inbox Selection In The URL

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments
- Related: [0008](0008-record-discussions-in-inbox.md)

## Context

The record-grouped Comments Inbox kept its selection in component state. A
refresh or shared link lost the selected discussion. The record caption was
plain text and the Open Record icon lacked the native button icon slot.

## Exchange

- 2026-11-22 Kareem: "`[preview URL redacted]` doesn't keep selected comment thread in url state, fix"
- 2026-11-22 Kareem: "this should be like a href that would open the record"
- 2026-11-22 Kareem: "plz fix the alignement and spacing"
- 2026-11-22 Agent: proposed URL-backed record and expanded-thread selection, real record links, and the native button icon slot for spacing.

## Decision

Persist the selected record and expanded comment thread in Inbox URLs. Refresh,
shared links and browser history must restore the selection. Make the record
caption a real hyperlink, and align the Open Record icon and label with native
button spacing.

## Consequences

The Inbox reads `objectName`, `recordId` and optional `comment` query parameters.
Choosing another record clears the previous thread; returning to the list clears
the selection. Legacy notification URLs resolve to the canonical record URL.
Record links retain normal browser behavior, including opening in another tab.
The existing record sidebar keeps its local expansion behavior.

## Evidence

Implemented and verified in the isolated preview on 2026-11-22. All 61 app
tests and app typecheck pass. Browser checks cover URL updates, reload, history,
opening a record in another tab and native icon alignment, with no page errors.
Implementation details are maintained in the
[app README](../../../packages/twenty-apps/internal/comments/README.md).
This correction does not authorize production changes or resume OpenBot work.
