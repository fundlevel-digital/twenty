# Live CRM Rollout — 2026-11-21

[Repository decision 0005](../decisions/0005-roll-out-six-sessions-to-live-crm.md)
records the owner's renewed deployment request for Conductor workspaces 901, 887,
899, 903, 900 and 890, superseding the earlier deployment cancellations.

## Deployed

The six sessions were already merged into main. Server and worker now use
`ghcr.io/fundlevel-digital/twenty:d8bd3bb0d21933401dc5ce49e3cfe1ad3272775e`, digest
`sha256:78f7d421d4d459d7a8523a5ac6e876d533306a60359d08147f006d74ed4a490d`.
The [release build](https://github.com/fundlevel-digital/twenty/actions/runs/44931455037)
passed. The prior image was `fundlevel-twenty:4f27f1a4d2-relation-picker`.

The release includes the dashboard/attribute fixes and computed-field editor.
The existing YouTube installation and its 90 channels remain present. LinkedIn
Sync's migration-stage app, PlusVibe and Slack Sync were applied to the Fundlevel
workspace using the fork's CLI and `--no-prune`. Slack OAuth and live events remain
pending at the owner's explicit instruction. Other CRM workspaces receive the
shared core upgrade, not new installations of these workspace-scoped apps.

The obsolete LinkedIn widget referenced a missing component and blocked layout
validation. Its widget and otherwise-empty legacy tab were removed through the
metadata API; the newly installed canonical LinkedIn tab remains. All remaining
front-component widget references resolved after cleanup.

## Upgrade And Recovery Procedure

A fresh production snapshot was streamed into an isolated PostgreSQL container.
Its app and worker used separate storage and Redis, with external networking
blocked. No database dump or upload backup archive was generated on the host.
The host's existing prohibition on local application backups was preserved.

The standard upgrade initially failed: the deployed fork's cursor sorted after
upstream 2.60 instance migrations that were absent from the actual schema. This
left the navigation `SECTION` enum value and system-side-effect role columns
missing. Running all missing instance commands after an attempted full upgrade
also leaves the recorded cursor behind already-removed `jobConfig` columns.

The verified sequence from a fresh snapshot was:

1. `command:prod run-instance-commands --include-slow --force`.
2. `command:prod upgrade:2-60:drop-workspace-workflow-version-object` for the
   outstanding workspace command skipped by the old cursor. It reported zero
   legacy workflow-version records in both active workspaces.
3. `command:prod upgrade`, then `command:prod cache:flush`.
4. Start a fresh server process so its entity metadata reflects the final cursor.

The full upgrade passed on the isolated copy, followed by successful application
installs. The same sequence then passed live: both active workspaces succeeded
with zero failures. Only the two workspaces selected by the provisioned-workspace filter were upgraded.

Off-host pgBackRest and restic backups completed with application writes stopped
before cutover. Existing image tags remain available, but a database rollback
requires the matching pre-upgrade database/files, not merely an image downgrade.
Database and Redis services, volumes, domain settings and encryption keys were
preserved. `APP_VERSION=2.61.0` is explicit for server and worker. Automatic startup
migrations/cron registration are disabled; upgrades and cron registration ran
explicitly. Cron registration reported 31 successful, zero failed, four skipped.
Server and the regular worker were brought back on the pinned image.

## PlusVibe Data Migration

The published `psl` package hides its declarations through its export map. A
[declaration bridge](../../packages/twenty-apps/public/plusvibe/src/types/psl.d.ts)
fixes app compilation without changing its runtime import. All 142 app tests pass.

The [administrator migration](../../packages/twenty-apps/public/plusvibe/scripts/migrate-existing-records.cjs)
uses native channel services and a workspace ORM transaction. It populated
sender/source-thread relations and reassigned existing message associations to
outreach/Unibox channels. No production SQL writes were used. Saved preferences
control Unibox visibility, defaulting to Metadata. Legacy fields were retained.

On the isolated copy, 1,475 messages across 807 conversations were preserved.
A second apply reported zero associations left to move and verified a digest of
message IDs, conversation IDs, content, timestamps and provider IDs. The live
migration preserved the same 1,475 messages and 807 conversations. It produced
196 destination channels and populated 807 conversation/sender and 807
source-thread/conversation links. Two messages had no provider thread ID and
retain that absence.

The saved account API key's fingerprint matched the existing mail connection
before a native member-owned key connection was created through the normal
connection service. Its existing owner was preserved. The existing selected
workspace was retained and pinned to that connection. The connection hook was
verified without starting a full history import; the existing failed/paused import
state still carries its pre-rollout timestamp.

A full source Lead/history refresh and final schema pruning have not run. Source
Lead IDs are not inferred from People records. The documented ambiguity of the
provider's second thread endpoint remains a limitation; verify source history
before pruning or a full refresh. See the [PlusVibe runbook](../../packages/twenty-apps/public/plusvibe/README.md).

## LinkedIn Remaining Work

The migration-stage application is installed; final pruning and legacy-data
retirement have not run. All 821 legacy messages and 144 chats remain intact.
The existing native LinkedIn connection belongs to the separate official app,
not LinkedIn Sync. That app was not uninstalled because its hooks can delete
upstream accounts.

The owner intends to connect LinkedIn Sync later. [Decision 0006](../decisions/0006-connect-linkedin-after-the-rollout.md) defers native connection and its dependent history migration; no immediate owner action is required for the deployment.
One legacy account has an assigned member and 584 messages. The second has no
assigned owner and 237 messages; the owner was asked to choose its rightful
member. No ownership was guessed. Native privacy setup and multi-member access
verification, attachment reconciliation, message migration and direct webhook
verification must precede final pruning. The migration is not complete merely
because its app is installed. Follow the [staged cutover](../../packages/twenty-apps/internal/fundlevel-linkedin/README.md#staged-cutover).

## Verification And Limits

- Server, PostgreSQL and Redis were healthy; the regular worker runs on the same
  pinned release as the server.
- HTTPS health passed for the CRM, shared login host and Sunny workspace.
- The frontend shell's 1,078 referenced JavaScript/CSS assets returned HTTP 200.
- Authenticated metadata and record queries passed, including app installations,
  140 layouts and the preserved message/channel counts.
- The corrected layout has zero missing front-component references.
- No authenticated browser interaction or live Slack OAuth/event round trip was
  claimed. LinkedIn provider and privacy checks remain pending as described above.
- Hindsight recall/retention was unavailable because this VM lacks its private
  profile; no remote-memory write is claimed.

Post-rollout off-host database and file backups completed successfully. The
isolated database/app/worker containers and their anonymous volumes were removed
after verification. The refreshed CLI auth fields were saved back to the owner’s
Mac without changing its other remotes. Temporary SSH access and copied deployment
credentials were removed at handoff.

Private operational logs, configuration and rollback inputs remain outside Git.

## Owner-Reported Connection Follow-Up

Slack’s custom callback incorrectly required `state` after Twenty’s controller
had validated and removed it. The app now retains the exact redirect URI by
provider, forwards core state during authorization, and accepts the core’s
callback payload without duplicating state validation. A regression covers the
real payload and overlapping login flows. All 79 Slack app tests, typecheck, lint
and app build passed; the fix was applied live (two logic functions updated).
A fresh Connect Slack attempt is needed; no successful user OAuth round trip is
claimed by the deployment checks.

[LinkedIn decision 0010](../decisions/linkedin/0010-automatic-webhook-and-internal-configuration.md)
records the archive-field cleanup, internal readiness guard and automated
webhook setup. The new configuration was applied using the migration-stage app:
four functions changed and five metadata entities were removed (three variables,
one obsolete tab and its widget). All 821 legacy messages and 1,475 PlusVibe
messages remained intact. The Unipile endpoint and encrypted secrets were
configured automatically; signed/unsigned probes returned 200/401.

## Follow-Up: App Automation And Bulk Slack Settings

Kareem clarified that the app must manage its webhook itself, rather than an
administrator running setup once. LinkedIn Sync now runs setup in its native
settings-save health check and retries every five minutes. The only workspace
credential field is **Unipile Service Key** (`UNIPILE_API_KEY`); the manual
signing-secret field was pruned. No message objects or fields were pruned.
The obsolete administrator helper is retired.

The app discovers Twenty's workspace URL when no public app domain is configured.
It adopted the existing explicitly scoped endpoint, kept its provider ID, and
changed delivery to the app-managed workspace route. Two live app health checks
returned `SUCCESS` / `Webhook Configured`; signed synthetic non-LinkedIn delivery
returned HTTP 200, unsigned and incorrect-signature deliveries returned HTTP 401.
Only the endpoint ID is persisted in app KV. Its signing secret stays at Unipile
and is fetched with the saved Service Key for verification. Unrelated endpoints
are excluded, and legacy adoption is scoped to the known endpoint and install.

Slack Sync now offers one searchable checklist for channels and DMs with
conversation-type filters, bulk selection, readable profile names and one
Save Sync Settings action. Saving updates native folder inclusion and batches
historical imports using the shared history setting. The handler validates all
connections and conversation IDs before making changes, and retains retry state
if selection is saved but history enqueue fails. Previously imported messages
are retained when a conversation is unselected.

The live settings API returned 82 conversations and 36 selected; the earlier menu
hid everything not already selected. A refresh was queued to resolve old DM user
IDs through Slack profiles, while preserving selections. A subsequent read found
zero remaining raw DM user-ID labels and confirmed the five-minute webhook
repair schedule. No bulk selection or
history import was submitted on the owner's behalf. Browser checks with sample
data verified row selection, bulk selection, filtered clearing and save behavior
at desktop and mobile sizes. Screenshots are private `.context/` preview artifacts,
not screenshots of live customer records.

Validation: LinkedIn app typecheck, 302 unit tests, 12 legacy tests and lint;
Slack app typecheck, 89 unit tests, lint and CLI build. Both apps were applied to
the live Fundlevel workspace; the LinkedIn migration-stage schema was retained.
The core server image was unchanged. Core cron registration completed with
31 successful, zero failed and four intentionally skipped jobs.

The 821 LinkedIn legacy messages and 144 chats remain intact. A read-only check
found 1,480 PlusVibe native messages and 807 threads, five more messages than the
earlier rollout count; this follow-up did not change the PlusVibe app or submit a
PlusVibe import. LinkedIn sign-in, legacy-message migration and native privacy
verification remain deferred.

Owner corrections are recorded in LinkedIn decision 0011 and Slack decision 0015.
Hindsight recall remains unavailable because the private repo profile could not
be resolved; these verified findings are retained in repository documentation.
