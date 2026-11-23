# Comments

An installable Twenty app for comments on records and list entries, inspired by the supplied Attio screenshots. The same Comments command and record widget are available across standard and custom objects. See the [Attio comparison](ATTIO-PARITY.md) for implemented behavior and remaining integration checks.

## Live Release

Deployed to the live CRM on 2026-11-22 from merged PR #23 (`43c3a322390f6c7485e8c5cc9fc7eafb7a06bd88`), including the core Inbox/renderer changes and the workspace app. Installation created 77 metadata entities without updating or deleting existing entities; all 13 previous apps were retained. Authenticated Inbox and record reads, public assets, service health and pre/post offsite backups passed. See the [release handoff](../../../../docs/handoffs/2026-11-22-comments-live-release.md) for evidence and limits, including recipient-access filtering before adding restricted members. OpenBot changes in this branch have only been installed into an isolated preview.

## Standalone Object Support

Comments works directly with Twenty's standard and custom records. A list entry is a record in its list's custom object; the app uses that object name and record ID without requiring a parent relation, provider metadata or another app. The ordinary object label supplies its display context.

There is no Better Lists installation or merge-order dependency. The earlier workspace 932 prerequisite and reminder were canceled by [decision 0007](../../../../docs/decisions/comments/0007-independent-comments-for-any-object.md). Keep the instruction not to message that thread.

An optional adapter supports selected bot mentions and displays attributed replies from the separate [OpenBot app](../openbot/README.md). Bot settings, credentials, delivery and Task automation belong to OpenBot. See [adapter behavior](src/openbot/README.md).

## Behavior

- Write comments and replies, insert emoji, and type `@` to search for users and records to mention. The composer retains the OpenBot group's identities and avatars when integrated with the OpenBot app source.
- Choose a suggestion with the mouse, arrow keys and Enter/Tab. Selection replaces the typed fragment and restores the caret after the worker sends the new text to the host. Unselected mentions block saving; removed mentions do not notify. Email addresses remain ordinary text, including a selected reference edited into an email. Toolbar insertion adds a space when needed so mentions after text or emoji stay valid. Search failures and no matches have explicit feedback.
- Open the Comments tab on Company and Person records. The tab and command sidebar share the same saved threads. Other objects can use the command or add its widget to their record layout.
- Every target record has its own feed. Records used as list entries stay separate from parent records and other entries. The composer displays the ordinary object label, and access checks use the target record itself.
- Selected user mentions deliver an application Inbox message containing the comment, author and a reference to the source record. Self mentions do not notify.
- Resolve and reopen threads. Filter by resolved status or threads you started or replied to.
- Delete your own comments. Deleted original comments leave a tombstone when replies remain.
- Copy a record URL carrying the thread ID. Open Comments after following the link to expand that thread.
- Submit with Cmd/Ctrl+Enter. Failed saves preserve the draft. A failed Inbox delivery leaves the saved comment intact and displays a warning.

Comments persist in the app-owned Record Comment object. The sidebar invokes the app function through the metadata API so host authentication-proxy cookies are preserved; the HTTP route remains available for integrations. The authenticated handler checks access to the target record using the caller's credentials before reading or writing comments with the application's role. Author identity comes from the execution context. The application role can read records across objects, write its own comment object, and use the system AI flag required by Twenty's Inbox API plus the Workflows flag required to execute the app's function through metadata. Twenty intersects delegated application requests with the triggering member's record permissions, so the target check remains constrained by that member's access. Notification delivery explicitly uses the application token; target and mention validation use the caller's token.

## Comments In Inbox

The native Inbox has an optional Comments section beside Channels and Direct Messages. Record Discussions opens `/inbox?section=comments`: a searchable record list with each record's existing comment threads and reply composer. Selection is encoded in `objectName`, `recordId` and optional `comment` query parameters. Refresh, shared URLs and Back/Forward restore the selected record and expanded thread. Choosing a new record clears the previous thread. New comments and replies update the record's excerpt and move it to the top. The record caption and Open Record action are real links to the source record, including normal browser support for opening another tab. Separate custom records, including list entries, remain separate groups.

This surface is supplied by the app's `comments-inbox` front component (universal identifier `93fb26b8-7593-4d9e-91ee-a1aa52821d17`). The accompanying host integration discovers that optional component from workspace metadata; uninstalling the app removes the navigation section. No Better Lists or OpenBot installation is needed.

Discussion pages scan 100 recent non-deleted comments at a time and return only records the caller can read. Load Older Discussions continues the scan, merging repeated records without replacing their newer excerpts. Search filters the loaded discussions; older pages are loaded explicitly. This is an activity feed of accessible records, not a new unread-state or subscription system.

Existing Comments mention notifications redirect into the record discussion before the AI composer mounts, then replace the notification URL with the canonical record selection. Classification uses the installed app's sender ID, not notification titles. The app resolves the notification as the caller, verifies its sender against its own logic function's application ID, reads the leading target reference and checks target access again. Opening the native notification marks it read through the existing Inbox status API. Replies save through the normal Comments handler; they never send an AI chat message.

## Development and Installation

Use Node 24.5 or later and Yarn 4. From this directory:

```sh
yarn install
yarn typecheck
yarn test
yarn twenty app build
```

Configure a Twenty CLI remote for the intended development workspace, review `yarn twenty app plan --remote <name>`, then install with `yarn twenty app apply --create --remote <name>`. Installation changes workspace metadata; choose the intended remote explicitly.

Select one record and run **Comments** from its command menu, or add the Comments widget to its record layout. No object-specific configuration is needed. Users must have access to the source record. Workspace administrators control the comment object's direct API permissions separately; the application's own role cannot be assigned to users or API keys.

## Verification and Limits

Typechecking, the CLI build, and tests cover thread/reply creation, mentions, notification failure, draft preservation, record access, author-only deletion, filters and pagination. Light and dark component rendering was checked with sample data in a browser harness. An isolated VM preview is installed with development seed data. Live checks verified comment creation, persisted replies, resolve/reopen and an Inbox notification visible to the mentioned member. Browser checks verified login, the source record page, opening Comments from the native command menu, emoji comment creation and persistence, deletion, and the user mention picker. The redesigned sidebar uses native dropdowns, author avatars and relative timestamps. Its metadata transport was verified with browser app-route requests blocked. The browser used local TLS for the same preview origin, bypassing Conductor’s sign-in gate; the anonymous public edge correctly returns its authentication gate. At that preview handoff, production had not been changed.

The app uses explicit Refresh, without live subscriptions. Emoji insertion is supported; emoji reactions are not implemented. Copy Link requires opening Comments on the destination record. Native notification chat replies are not synchronized into comment threads; the Inbox Comments section writes directly to the same record comments. Failed notification deliveries display a warning and are not retried automatically. User mention search currently examines the first 200 workspace members.

The VM preview runs the frontend from this checkout, with server, worker and frontend under a detached restart supervisor. PostgreSQL and Redis use dedicated Docker services and a persistent preview database volume. Processes survive command-tool exits and restart on failure while the VM remains running; no VM wake mechanism is configured. That preview setup performed no production deployment, production data copy or paid external API batch. Private preview addresses, session state and supervisor scripts are in ignored `.context/`.

The sidebar menu placement requires the accompanying renderer fixes in this branch: document elements must inherit from HTMLElement, the synthetic body must be a positioned containing block, and document coordinates must use the viewport origin. These changes correct Floating UI positioning without per-menu offsets. The composer imports its SDK version's UI stylesheet so its native dropdown classes, scrolling and selected states match.

Keyboard selection also requires the host renderer's editable-keyboard guard. An active `aria-autocomplete="list"` control declares its active suggestion and the `Control+Enter Meta+Enter` submission shortcuts. The host reserves these keys synchronously before forwarding them to the worker, preventing newline, focus and outer-page shortcut races. Regular typing, Shift+Enter and IME composition keep their native behavior. Rebuild the renderer library and fully reload the frontend after installing this host change.

Current checks include 61 Comments tests and 13 focused native Inbox tests and 22 renderer keyboard/form-control tests; the geometry change was previously verified with 25 renderer tests. The app typecheck and CLI build pass. The source renderer library builds and changed renderer files pass lint. A full renderer typecheck is currently blocked by missing generated declarations in this VM's directly built shared/SDK dependencies; it has not been reported as passing. Live preview checks cover Company record-tab rendering and shared threads, typed suggestions, selection/caret continuity, validation and an incoming native Inbox notification. The notification uses two seeded members; self mentions intentionally do not notify. The preview has no AI provider configured. The Comments Inbox surface uses the regular comment composer and does not need one.

The isolated preview contains native custom-record fixtures, including two records related to the same company. API checks verified separate record feeds, replies, cross-target deletion rejection and resolve/reopen without Better Lists installed. A plain custom record without a parent relation or provider marker was verified through both the API and the actual Comments panel, including its object label and saved reply.

The requested privacy configuration still needs a final scope. Comments already checks native target-record access. A custom privacy-settings UI and filtering notifications for recipients without target access remain independent Comments work. OpenBot changes in this branch have only been installed into an isolated preview.


The record-grouped Inbox was browser-verified on 2026-11-22: an existing incoming mention redirected into the correct discussion, a reply saved and appeared on its source record, and the latest excerpt moved to the top. No AI message mutation or browser page error occurred during that path. Light and dark rendering, a 390px mobile layout, record search and a fresh login with both fields prefilled were also checked. Browser verification used local TLS with the public hostname mapped to the VM; the anonymous public edge returned the expected Conductor sign-in gate, so an authenticated edge session was not independently verified. Changed native Inbox files pass lint and focused tests. The attempted full frontend typecheck was killed by the VM memory limit; it is not reported as passing.


The Inbox URL correction was browser-verified on 2026-11-22: selecting a record and expanding a thread updates the query parameters; reload and Back/Forward restore the same thread. Ctrl-clicking the record caption opens the correct record in a separate tab without changing Inbox selection. The Open Record icon uses the native icon slot with a measured 4px gap and matching vertical centers. Explicit anchor rendering preserves the Button content wrapper, which the pinned UI package's automatic link rendering otherwise replaces. All 61 app tests and the app typecheck pass. These checks use the same VM browser path described above; no production changes were made.
