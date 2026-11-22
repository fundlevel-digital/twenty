# Comments

An installable Twenty app for record-specific comment threads, inspired by the supplied Attio screenshots. The same Comments command and record widget are available across standard and custom objects.

## Behavior

- Write comments and replies, insert emoji, and type `@` to search for users and records to mention. The composer retains the OpenBot group's identities and avatars when integrated with the OpenBot app source.
- Choose a suggestion with the mouse, arrow keys and Enter/Tab. Selection replaces the typed fragment and restores the caret after the worker sends the new text to the host. Unselected mentions block saving; removed mentions do not notify. Email addresses remain ordinary text, including a selected reference edited into an email. Toolbar insertion adds a space when needed so mentions after text or emoji stay valid. Search failures and no matches have explicit feedback.
- Open the Comments tab on Company and Person records. The tab and command sidebar share the same saved threads. Other objects can use the command or add its widget to their record layout.
- Selected user mentions deliver an application Inbox message containing the comment, author and a reference to the source record. Self mentions do not notify.
- Resolve and reopen threads. Filter by resolved status or threads you started or replied to.
- Delete your own comments. Deleted original comments leave a tombstone when replies remain.
- Copy a record URL carrying the thread ID. Open Comments after following the link to expand that thread.
- Submit with Cmd/Ctrl+Enter. Failed saves preserve the draft. A failed Inbox delivery leaves the saved comment intact and displays a warning.

Comments persist in the app-owned Record Comment object. The sidebar invokes the app function through the metadata API so host authentication-proxy cookies are preserved; the HTTP route remains available for integrations. The authenticated handler checks access to the target record using the caller's credentials before reading or writing comments with the application's role. Author identity comes from the execution context. The application role can read records across objects, write its own comment object, and use the system AI flag required by Twenty's Inbox API plus the Workflows flag required to execute the app's function through metadata. Twenty intersects delegated application requests with the triggering member's record permissions, so the target check remains constrained by that member's access. Notification delivery explicitly uses the application token; target and mention validation use the caller's token.

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

Typechecking, the CLI build, and tests cover thread/reply creation, mentions, notification failure, draft preservation, record access, author-only deletion, filters and pagination. Light and dark component rendering was checked with sample data in a browser harness. An isolated VM preview is installed with development seed data. Live checks verified comment creation, persisted replies, resolve/reopen and an Inbox notification visible to the mentioned member. Browser checks verified login, the source record page, opening Comments from the native command menu, emoji comment creation and persistence, deletion, and the user mention picker. The redesigned sidebar uses native dropdowns, author avatars and relative timestamps. Its metadata transport was verified with browser app-route requests blocked. The browser used local TLS for the same preview origin, bypassing Conductor’s sign-in gate; the anonymous public edge correctly returns its authentication gate. Production has not been changed.

The app uses explicit Refresh, without live subscriptions. Emoji insertion is supported; emoji reactions are not implemented. Copy Link requires opening Comments on the destination record. Inbox items are notifications, with replies continuing in Comments rather than synchronizing replies from Inbox. Failed notification deliveries display a warning and are not retried automatically. User mention search currently examines the first 200 workspace members.

The VM preview runs the frontend from this checkout, with server, worker and frontend under a detached restart supervisor. PostgreSQL and Redis use dedicated Docker services and a persistent preview database volume. Processes survive command-tool exits and restart on failure while the VM remains running; no VM wake mechanism is configured. No production deployment, production data copy or paid external API batch was performed. Private preview addresses, session state and supervisor scripts are in ignored `.context/`.

The sidebar menu placement requires the accompanying renderer fixes in this branch: document elements must inherit from HTMLElement, the synthetic body must be a positioned containing block, and document coordinates must use the viewport origin. These changes correct Floating UI positioning without per-menu offsets. The composer imports its SDK version's UI stylesheet so its native dropdown classes, scrolling and selected states match.

Keyboard selection also requires the host renderer's editable-keyboard guard. An active `aria-autocomplete="list"` control declares its active suggestion and the `Control+Enter Meta+Enter` submission shortcuts. The host reserves these keys synchronously before forwarding them to the worker, preventing newline, focus and outer-page shortcut races. Regular typing, Shift+Enter and IME composition keep their native behavior. Rebuild the renderer library and fully reload the frontend after installing this host change.

Current checks include 34 Comments tests and 22 renderer keyboard/form-control tests; the geometry change was previously verified with 25 renderer tests. The app typecheck and CLI build pass. The source renderer library builds and changed renderer files pass lint. A full renderer typecheck is currently blocked by missing generated declarations in this VM's directly built shared/SDK dependencies; it has not been reported as passing. Live preview checks cover Company record-tab rendering and shared threads, typed suggestions, selection/caret continuity, validation and an incoming native Inbox notification. The notification uses two seeded members; self mentions intentionally do not notify. The preview has no AI provider configured, so Inbox's AI composer remains unavailable and comment replies continue in Comments.

The requested connection privacy controls are pending clarification of whether the connection belongs to OpenBot or to a user's comment visibility settings. No privacy behavior has been inferred from the email/calendar comparison.
