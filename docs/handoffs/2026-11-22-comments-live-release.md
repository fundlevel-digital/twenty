# Comments Live Release — 2026-11-22

## Deployed

[PR #23](https://github.com/fundlevel-digital/twenty/pull/23) merged as
`43c3a322390f6c7485e8c5cc9fc7eafb7a06bd88`. Its
[image build](https://github.com/fundlevel-digital/twenty/actions/runs/45049118369)
passed. Server and worker now use
`ghcr.io/fundlevel-digital/twenty:43c3a322390f6c7485e8c5cc9fc7eafb7a06bd88`,
digest `sha256:0300cb425db190753e717fb164fe4c1abe988d413cd3d74b63bfd6b3dd2ae3a9`.

The Comments app was installed in the existing Fundlevel workspace from that
exact source using CLI 2.59.0 and `app apply --create --no-prune`. All build,
registration, installation, planning, upload, sync, pull-base and client-generation
phases completed. The built and installed content hashes match:
`d47b11949271ab0dca4d4a5c0772a7dfa99bd806e2377cfd256b9bfaf6e5a7a5`.

Installation created **77 metadata entities**, with zero updates, deletions,
destructive actions or cascades. All 13 previous applications remain installed;
Comments is the fourteenth. Its two front components, two Comments record tabs
and one logic function are available. No OpenBot delivery was enabled.

## Cutover And Backups

[Owner approval](../decisions/comments/0010-deploy-comments-to-live-crm.md)
authorized the rollout. No core server, shared package, SDK or production
Dockerfile changes occurred since the previous live image,
`1913516c9b8e4b3177c9ccb50412b551a300c9f3`. No core schema upgrade or cron
registration was needed; the app installation created its own workspace metadata.

Application writes stopped at 17:32:44 UTC. The existing offsite
`pgbackrest-backup@twenty-crm.incr.service` and `restic-twenty-files.service`
both passed before cutover, finishing at 17:33:01 and 17:32:59 UTC respectively.
The new core was verified at 17:33:30 UTC. No local database dump or upload backup
archive was created.

Only the existing server and worker image pins changed. An exact resolved-Compose
comparison excluding those pins matched the baseline. Runtime environment hashes,
mounts and network membership were preserved. Database and Redis retained their
original containers. The previous image remains available; no volumes or images
were pruned. The deployment helper would restore the prior pins on a failed
cutover, but rollback was not needed.

Post-installation backups also passed: pgBackRest finished at 17:38:15 UTC and
restic at 17:38:07 UTC, both with successful service results and exit status zero.
Private operational evidence remains on the production host and isolated Mac
release checkout. Production credentials were not copied into the cloud VM.

## Verification

- Server healthy, worker running, and zero restarts for both on the exact release
  image; database and Redis remain healthy.
- Public CRM and shared-login health returned HTTP 200.
- All 1,079 shell-referenced JavaScript/CSS asset requests passed, and the public
  entry JavaScript SHA-256 matched its deployed container file.
- Compiled assets contain the native Comments Inbox and document-prototype fixes.
- The signed-in member successfully executed the Comments Inbox action and read
  comments on an existing Company record, including the caller's target access
  check. Both feeds were empty as expected for a new installation.
- No CRM test records were created, no notifications were sent, and no analytics
  refresh or history import was started by verification.
- Server and worker logs since cutover contained zero `ERROR` lines.

The merged source had 61 app tests, 13 focused Inbox tests, app typecheck/build,
focused renderer checks and isolated browser verification. Production verification
used authenticated API calls and public assets; no authenticated production
browser interaction is claimed. The preview remains separate from live data.

## Remaining Scope

The live workspace currently has one member with global record read access and
no row-level predicates or rules. Self mentions intentionally do not notify.
Recipient-access filtering must still be completed before using mentions with
additional restricted members; this deployment does not claim multi-member
privacy validation. Connection-specific privacy settings remain unscoped.

The [Attio comparison](../../packages/twenty-apps/internal/comments/ATTIO-PARITY.md)
also tracks pending emoji reactions, automatic thread-starter reply notifications,
view-wide feeds and optional email notifications. OpenBot remains paused, and
Comments has no Better Lists installation or merge-order dependency.

Hindsight recall was unavailable because the private repository profile could
not be resolved; no remote-memory retention is claimed.
