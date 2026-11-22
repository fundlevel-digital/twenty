# Attio Reference And Remaining Integration Checks

Reference: [Attio Comments And Mentions](https://attio.com/help/reference/productivity-collaborating/comments-and-mentions), reviewed 2026-11-22.

| Behavior | Comments Implementation |
| --- | --- |
| Record and list-entry discussions have separate feeds | Target is the native object name plus its record ID. Entry feeds never fall back to the parent record. |
| List comments follow list access | The caller must read the entry itself before app-owned comments can be accessed. This uses native target-record permissions independently of any list app. |
| Mentions notify teammates | Implemented in Twenty Inbox. Filtering recipients who lack target-record access remains a release check; caller access alone does not establish recipient access. |
| Replies notify the thread starter | Pending. Current replies notify explicitly selected mentions. |
| Emoji reactions with membership and removal | Pending. Emoji insertion into comment text is available. |
| Resolve/reopen, own deletion, thread filters and comment links | Implemented. Links select the thread after opening Comments. |
| Comments from record/list views and a view-wide feed | Record command/widget and Company/Person tabs exist. Custom records use the same command/widget. A view-wide feed remains to implement. |
| Respond directly from Inbox | Pending. Notifications reference the record/entry; replies currently continue in Comments. |
| Optional email notifications | Pending. |

## Independent Record Model

Comments uses native object names and record IDs for reads, writes, replies, resolution, deletion, links and notification references. A record used as a list entry follows exactly the same path as any other custom record. No parent relation, provider description marker or list-specific response type is required. Object metadata supplies only the display label.

There is no Better Lists installation dependency or required merge order. [Decision 0007](../../../../docs/decisions/comments/0007-independent-comments-for-any-object.md) supersedes the previous workspace 932 prerequisite and reminder. The instruction not to message that thread remains.

Before release, check restricted members against target-record reads and notifications. In particular, a mention must not disclose comment contents to a recipient who cannot access its target. This is an independent Comments requirement rather than a dependency on a particular list app.
