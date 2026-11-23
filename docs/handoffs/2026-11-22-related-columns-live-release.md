# Related Columns Live Release — 2026-11-22

## Deployed

[PR #21](https://github.com/fundlevel-digital/twenty/pull/21) merged as
`1913516c9b8e4b3177c9ccb50412b551a300c9f3`. Its
[image build](https://github.com/fundlevel-digital/twenty/actions/runs/45046896299)
passed, and the production server and worker now use
`ghcr.io/fundlevel-digital/twenty:1913516c9b8e4b3177c9ccb50412b551a300c9f3`,
manifest digest
`sha256:629d87ce9526db2917024eafa196054b6b6bc0d7212f41f604d08b85dd0fdaab`.

The release adds related attribute columns across single and multiple-record
relationships, saved multistep paths, source-record chips that open the side
panel, complete-chip overflow and corrected picker row spacing. Paths permit
five stored relationship hops and one step that expands to multiple records;
a junction consumes two stored hops. See the
[preview handoff](2026-11-22-related-value-chips.md) for implementation validation.

## Cutover And Rollback

[Owner approval](../decisions/related-columns/0006-deploy-the-merged-related-columns-release.md)
authorized this production deployment. The source comparison with the previous
live image, `d8bd3bb0d21933401dc5ce49e3cfe1ad3272775e`, had no changes in
`twenty-server`, `twenty-shared`, `twenty-sdk` or the production Dockerfile area.
No schema upgrade, application reinstall or cron registration was needed.

The new image was pulled through the host's existing deployment-user registry
login. Application writes were stopped while the existing offsite pgBackRest
and restic jobs ran. Both succeeded before cutover: database backup
`20261116-170335F_20261122-170842I` and file snapshot `399e2216`.
No local database dump or upload backup archive was created.

Only the server and worker image pins changed in the existing Compose file.
An exact comparison of the resolved Compose configuration confirmed no other
configuration changes. Database and Redis containers were preserved. Environment
hashes, mounts and network membership matched the recorded baseline for all four
services. Automatic migrations and cron registration remain disabled as before.
The previous pinned image remains available for rollback; this release made no
schema changes. Private operational evidence remains on the host.

The influencer/channel migration and pricing copy were already completed
separately. Neither operation was repeated, and this deployment submitted no
analytics refresh or history import.

## Verification

- Server healthy; worker running; both use the exact merged release image and
  have zero restarts. Database and Redis remain healthy on their original containers.
- Local health, public CRM health and shared-login health returned HTTP 200.
- All 1,078 shell-referenced JavaScript/CSS requests passed on recheck. One
  initial request failed transiently; the complete recheck had no failures.
- Public entry and related-record query asset hashes exactly matched the files
  inside the deployed container. Compiled assets contain the new path handling
  and multiple-record cutoff code.
- The saved Mac CLI session was refreshed and retained on the Mac. Authenticated
  metadata returned 80 objects; read-only queries returned 479 influencers and
  479 YouTube channels. Credentials were not copied to the cloud workspace.
- Server and worker startup logs contained zero error lines.

Native browser interactions were verified in the isolated preview before merge.
No authenticated production browser interaction is claimed by these deployment
checks. Hindsight remains unavailable because this workspace lacks its private
profile; no remote-memory retention is claimed.

Post-release offsite backups also passed: pgBackRest completed at 17:13:05 UTC
with backup `20261116-170335F_20261122-171240I` and no backup error; restic
completed at 17:12:45 UTC with a successful service result. Final service checks
still showed a healthy server, a running worker and zero restarts.
