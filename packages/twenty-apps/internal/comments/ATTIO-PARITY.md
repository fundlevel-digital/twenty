# Attio Reference And Remaining Integration Checks

Reference: [Attio Comments And Mentions](https://attio.com/help/reference/productivity-collaborating/comments-and-mentions), reviewed 2026-11-22.

| Behavior | Comments Implementation |
| --- | --- |
| Record and list-entry discussions have separate feeds | Target is the native object name plus its record ID. Entry feeds never fall back to the parent record. |
| List comments follow list access | The caller must read the entry itself before app-owned comments can be accessed. Final role behavior must be verified with Better Lists. |
| Mentions notify teammates | Implemented in Twenty Inbox. Filtering recipients who lack list access remains a release check; caller access alone does not establish recipient access. |
| Replies notify the thread starter | Pending. Current replies notify explicitly selected mentions. |
| Emoji reactions with membership and removal | Pending. Emoji insertion into comment text is available. |
| Resolve/reopen, own deletion, thread filters and comment links | Implemented. Links select the thread after opening Comments. |
| Comments from record/list views and a view-wide feed | Record command/widget and Company/Person tabs exist. Combined Better Lists entry navigation and a view-wide feed remain to verify or implement. |
| Respond directly from Inbox | Pending. Notifications reference the record/entry; replies currently continue in Comments. |
| Optional email notifications | Pending. |

## Better Lists Dependency

Comments must merge after [workspace 932](https://app.conductor.build/fundlevel/w/932). Remind Kareem of that order before any requested merge or deployment. Do not message its thread. See [decision 0006](../../../../docs/decisions/comments/0006-list-entry-comments-after-better-lists.md).

Better Lists currently models an entry as a native custom record related to its parent. Comments uses that entry's object name and ID for reads, writes, replies, resolution, deletion, links and notification references. A metadata description beginning `better-lists:v1:` identifies the list label shown in the composer; this marker affects presentation, not authorization.

Before release, verify the final merged creation model, open Comments from the actual list UI, check distinct entries for the same parent across lists, and test restricted members against both reads and notifications. In particular, verify that native entry permissions are constrained by the intended list membership and that a mention cannot disclose a private comment to an excluded recipient. Preview fixture checks are not a substitute for this combined integration.
