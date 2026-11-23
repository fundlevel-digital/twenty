# Fundlevel Google Groups Preview — 2026-11-22

[Decision 0003](../decisions/google-groups/0003-preview-google-groups-in-fundlevel.md) records Kareem's request to use Fundlevel instead of Sunny for this app.

## Preview And Installation

Preview: https://fundlevel-w935.conductor.show/settings/applications/045f20da-c1d3-4866-953f-cb6c6f7b58f3

Google Groups is installed in a fresh Fundlevel snapshot on this VM. Its current dropdown fix and four contact policies are included. The apply created 14 metadata entities, uploaded 26 files and made zero updates/deletions to existing entities. Source remains [the standalone app](../../packages/twenty-apps/public/google-groups/README.md). There are no host source edits, commits, merges or production app changes.

The new runtime uses the actual current live image `ghcr.io/fundlevel-digital/twenty:eb4afbe5b2f19d920a4b8ca60b1ca81ef490d1be`, including its bundled frontend. This differs from the older Sunny preview image. A read-only database dump and file stream copied Fundlevel from production. Other workspace entries and schemas were removed only from this new database. The Sunny preview database, apps, Google connection and saved preferences were preserved.

## Isolation And Configuration

Fundlevel has its own `fundlevel_preview` database in the VM's existing PostgreSQL container, a separate Redis on port 6381, separate file storage and server/worker containers. Runtime URLs target the preview; its internal logic URL is port 3003. Custom-domain routing, provider sync, delivery, billing, telemetry and cron registration use the established isolated-preview settings. The worker handles only workspace metadata, entity-event persistence, event logs and cascading deletions. No integration, workflow or cron queue is consumed.

The Google OAuth client definition from the Sunny preview was reused through the native registration-variable API. Google connection tokens and Group selections were not transferred between workspaces. In Fundlevel, **General → Google Workspace → Add Connection** still requires the owner's Google consent; then **Group Channels** requires choosing the account and entering Fundlevel's addresses. Readback confirms zero app connections, zero Groups, processing paused and contact creation set to Never. No Gmail import, contact creation or send was started.

The existing preview-only owner password was reused in this new clone. Production authentication is unchanged. Private runtime environment, tokens, browser drivers and connection configuration remain under ignored `.context/private/`; credentials and CRM record contents are not recorded here.

## Verification

- Restored 86 Fundlevel tables and 385,761 rows. Content digests matched 85 live tables exactly. `_slackChannel` retained the same 84-row count but had a different content digest in the later live comparison. The restored database is the dump's consistent snapshot, not a continuously synchronized replica.
- All 1,326 copied Fundlevel/shared files matched their source SHA-256 manifest, approximately 9.5 GB. The long initial tar stream was interrupted, so rsync resumed only missing/partial files; a complete verification then reported zero missing or changed files.
- The native settings handler loaded successfully with the paused, empty app state and all contact modes.
- Installed-app browser checks after scrolling measured zero-pixel gaps and matching left edges for account, contact and history dropdowns. The history menu opened upward at the viewport boundary; page errors were zero.
- The General page rendered the supplied logo, installed metadata and Google Workspace Add Connection action. Actual Google consent was not performed.
- A fresh owner login opened Fundlevel's Tasks view and rendered 22 records, visually verified in a private screenshot, with zero browser/HTTP errors.
- Screenshots are ignored `.context/fundlevel-google-groups.png` and `.context/fundlevel-google-groups-select.png`.
- Backend and gateway health passed. Anonymous public health returned Conductor's expected 401 sign-in gate. Browser verification used local TLS/host mapping on port 9444 and bypassed Conductor's edge.
- No app source logic changed in this installation turn. The preceding app verification passed typecheck, lint and 55 tests; runtime installation and browser checks cover this workspace switch.

## Owner Sync Follow-Up — 2026-11-22

Kareem reported: "It synced" (attached transcript from workspace 935, session
`e83eb3a9-06c1-4c88-843a-deaee6cdbc83`). A read-only check of this preview's app
storage subsequently confirmed a selected Google connection, three configured
Groups, processing unpaused, a 30-day history window and contact creation set to
Everyone. The current revision recorded 11 imported message entries, a successful
batch at `2026-11-22T21:19:15.907Z`, no saved error and phase `BACKFILL` with another
page pending. This verifies a successful initial batch, not a completed backfill.
The earlier empty/paused configuration above describes installation time.
Automatic integration cron remains disabled in this preview; further batches
require manual **Sync Now**. This follow-up ran no provider requests or imports.

## All-History Backfill — 2026-11-22

[Decision 0004](../decisions/google-groups/0004-backfill-all-available-group-mail.md)
records the subsequent authorization to import the entire available history.
The native settings handler saved All History while preserving the connected
account, the three enabled Groups, sharing preferences and Everyone contact
policy. This supersedes the earlier installation-time and initial-batch states.

The completed backfill reached `IDLE` with no error or page cursor at
`2026-11-22T22:02:21.879Z`. An additional incremental sync also reached `IDLE`
without changing the 372-entry import count at `2026-11-22T22:02:56.131Z`.
An independent Gmail list query without a date cutoff returned 353 distinct
candidate message IDs. All 353 were present in the app's saved import mappings;
there were zero missing or additional IDs in that comparison.

| Channel | Message Entries | Threads | Attachments | Oldest Message |
| --- | ---: | ---: | ---: | --- |
| Creators | 129 | 26 | 1 | 2026-11-03 |
| Ops | 214 | 54 | 122 | 2026-09-28 |
| Team | 29 | 26 | 1 | 2025-11-11 |

There are 372 Group-scoped message entries and 124 native attachment records.
Messages routed to more than one Group intentionally have separate entries.
Forty People were created during this backfill under the owner's Everyone
policy. All History covers matching mail still in the connected Gmail mailbox;
Groups-only archives, spam, trash and drafts remain outside this connector's
scope. Automatic integration cron is still disabled. This turn made authorized
Gmail API reads and preview imports; it did not send mail or change production.

The first attachment page exposed the missing `UPLOAD_FILE` permission. The
source app role now includes it; the reviewed preview apply created only that
role-permission assignment. Signed attachment PUTs then encountered Conductor's
same-origin gate. The ignored preview fixture now maps only PUT requests for
this preview hostname's `/file-upload/` path to its local backend, preserving
the signed query and body. Google requests and the tracked app's URL handling
are unchanged.

Further source fixes scope attachment cache entries to each Group and accept
extensionless uploads with an internal `.bin` suffix while preserving the
original attachment label. These prevent file ownership conflicts between
Groups and let the final pages import. Fresh no-prune plans applied only logic
function updates after the permission assignment, preserving configuration.
The source app passed 57 tests across seven suites, direct `tsgo` typecheck and
lint; the preview fixture also passed typecheck after its upload adapter change.

Read-only Gmail metadata verified that the previously reported duplicate was
one sent message from the owner's mailbox, with the Group as a CC recipient.
Native Gmail and Google Groups imported the same provider message ID under
different channels. Its Group copy correctly retains the original sender.
An incoming Team thread was verified in the bundled frontend with its Team
recipient and message body visible and no browser errors. Browser verification
used local TLS/host mapping, bypassing Conductor's edge. Private example links,
screenshots and runtime audit files remain under ignored `.context/`.

Some auto-created People have no display name when Gmail supplies only an email
address; Twenty can show them as Untitled. Existing People were not renamed.
This display limitation does not change the stored participant email or the
verified import counts. Hindsight remains unavailable; no memory write is
claimed. These source changes are uncommitted and applied only to the preview.

## Native Inbox Views — 2026-11-23

[Decision 0005](../decisions/google-groups/0005-preview-native-group-inbox-views.md)
records approval to preview mailbox browsing. The Google Groups sidebar folder
now contains All Group Emails, Team Inbox, Ops Inbox and Creators Inbox. They
are native Message Thread table views with Subject, From, Group, Received and
Attachments columns, newest received date first, opening the native side panel.

Four app-owned summary fields extend existing conversations; no messages were
copied. The initial reviewed no-prune apply created 49 metadata entities and
updated six bundles, with zero deletions. Authenticated app REST and key-value
APIs populated summaries from the already-imported records. There are 91
received-mail conversations: Team 12, Ops 54 and Creators 25, representing 357
received message entries and 124 attachments. Fifteen additional Group-scoped
message entries were sent from their Group address and belong outside these
received-mail summaries. The original 372 import mappings, three configured
Groups, All History preference and configuration revision were preserved.

The source app provides the reusable All Group Emails view and native folder.
The ignored fixture generates the three mailbox-specific views from the saved
preview configuration. These addresses are not embedded in tracked app source.
Future imports update the latest received sender/date and attachment totals.
The summary checkpoint is written after the native record update, so a failed
update can retry; replayed messages reuse their attachment counts. Older history
cannot move the displayed received date backwards. Native read permissions and
conversation rendering continue to handle message visibility and reply controls.

Browser verification exposed the difference between OBJECT and VIEW sidebar
items: OBJECT used the last object view and displayed the generic object label.
The four shortcuts were corrected to VIEW, with explicit view references. Their
existing object references were retained because that metadata property is
immutable; the follow-up plan and apply updated only those four items.

Validation: 61 tests across eight suites passed, including summary ordering,
replay counts, outgoing-mail exclusion and retry checkpoints. Direct package
`tsgo`, lint and formatting checks passed. Browser checks use the image's bundled
frontend via local TLS/host mapping; they bypass Conductor's edge. The combined
view rendered its fields, all Group addresses and 91 conversations with zero
browser errors. The screenshot under ignored
`.context/fundlevel-group-inboxes-preview.png` replaces subjects and senders with
neutral examples in the browser only; the actual preview retains the real mail.
The per-inbox browser checks rendered 12 Team, 54 Ops and 25 Creators rows, with
each view restricted to its own mailbox. Opening a Team row displayed its native
conversation side panel, Team recipient and one Reply control, with zero browser
errors. Results are stored privately under
`.context/private/fundlevel-inbox-browser-checks.json`. No reply was sent.

No Gmail requests, outbound messages, production changes, commits or merges were
performed for this inbox-view turn. The existing metadata worker, gateway and
server continue to serve it. Automatic integration cron remains disabled and
Hindsight remains unavailable; no memory write is claimed.

## Processes And Recovery

The active Conductor preview port is now **3004**, its Fundlevel gateway to server port 3003. The gateway preserves the existing authenticated app-route bridge and WebSocket forwarding. Both new gateway and local TLS proxy use detached processes with private PID/log files prefixed `fundlevel-` under `.context/private/`.

Containers `fundlevel-preview-server`, `fundlevel-preview-worker` and `fundlevel-preview-redis` use `unless-stopped`. PostgreSQL remains `sunny-preview-postgres` and contains both isolated databases. A running Docker daemon is still required; no VM-shutdown survival or automatic wake mechanism is claimed. The original Sunny gateway remains on port 3002, and `conductor preview set --port 3002` switches the public URL back to it when requested.

The first app upload used the Sunny fetch adapter and hit its backend's 404s. After reviewing a fresh no-prune plan, the Fundlevel adapter mapped only this preview hostname to port 3003 and the apply succeeded. No workspace reset or uninstall was needed. The temporary production SSH key was removed from authorized keys after file verification. Its VM private key, full snapshot dump and raw production-container inspection were deleted. Hindsight's private profile remains unavailable; no memory write is claimed.

## Pull Request Preparation — 2026-11-23

Kareem requested: "Create a PR .context/attachments/5j2vIQ/PR instructions.md".
The attached instructions approve committing the current workspace changes,
pushing the existing branch and opening a pull request against `main`. This
includes the standalone Google Groups app, inbox summaries and generic native
view, plus the Sunny/Fundlevel operational handoffs and decision records. Private
runtime configuration, copied CRM data, browser state, preview fixtures and
workspace-specific inbox shortcuts remain ignored.

Fresh validation passed 61 app tests across eight suites, direct package `tsgo`
typecheck, lint and the tracked source app build. Native Google delivery and
workflow execution remain unverified; the app does not add a dedicated Group
email workflow trigger. The PR request does not authorize merging or production
deployment. Memory recall remains unavailable because the private profile is
missing; no retention is claimed.

## Main Integration — 2026-11-23

Kareem requested: "Merge the remote branch (main) into your branch and resolve conflicts. Then, commit and push your changes."
The integration brings `origin/main` at `41415c827b` into
`conductor/twenty-crm-sunny-setup` for PR #37. Three decision-index conflicts were
resolved by preserving both branches' entries. This branch's repository records
were renumbered from 0007–0009 to 0010–0012 to avoid incoming collisions; their
content and linked decisions remain the same. References were updated throughout
the affected records and handoffs, including corrected enum-record links in the
Cal.com and PlusVibe indexes. All 132 local documentation links checked resolve.

The Google Groups app had no source conflicts and is unchanged by this merge.
Fresh verification passed 61 tests, direct package typecheck, lint and app build.
Nx's shared-package build stalled in barrel generation and was stopped; the
shared package's actual Vite build, declaration emit and alias-rewrite commands
then completed successfully before the app typecheck/build. No generated source
changes were retained. This integrates main into the PR branch; it does not
merge the PR into main or deploy production. Memory remains unavailable.
