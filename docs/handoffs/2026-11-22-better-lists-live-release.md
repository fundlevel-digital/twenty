# Better Lists Live Release — 2026-11-22

## Deployed

[PR #29](https://github.com/fundlevel-digital/twenty/pull/29) merged as `ea0a75d7565451ac61faedc8248ed5e96d67e2d2`. Subsequent main merges cancelled that commit's image build. The successful [replacement build](https://github.com/fundlevel-digital/twenty/actions/runs/45055341357) is commit `eb4afbe5b2f19d920a4b8ca60b1ca81ef490d1be`; its core, frontend, shared packages, SDK, renderer, UI, client SDK, emails, Docker files and root build configuration are identical to the Better Lists merge. The later workspace-app changes are not installed by this rollout.

Server and worker now use `ghcr.io/fundlevel-digital/twenty:eb4afbe5b2f19d920a4b8ca60b1ca81ef490d1be`, digest `sha256:7c190fc6a8317e8d8b293d87c17a67854bef265e0abc0a17190e13ee55059849`. The previous Comments image remains available for rollback.

The Better Lists SDK app is installed in the existing Fundlevel workspace. Its three commands are Create Better List and Manage Better Lists globally, plus the pinned Add to List selection action. The USER-scoped Lists menu provides the App Preferences entry. Parent synchronization, immutable-parent guards and generic deletion cleanup run in the deployed host.

Installation created **10 metadata entities**, with zero updates, deletions, destructive actions or cascades. All 15 previous applications remain installed; Better Lists is the sixteenth. All 84 previous objects remain present. No preview lists, demo entries, customer records or new list objects were created by deployment verification. The Workspace Lists folder and parent membership fields are created when the user creates a list.

## App Artifact And Installation

The artifact was built from the merged Better Lists source using this checkout's 2.61 CLI builder and linked SDK packages. The published 2.59 CLI used by older app releases cannot substitute for these newer APIs. A portable bundle of the exact CLI deployment modules ran on the Mac against its existing Fundlevel remote, with creation authorized, deletion inference disabled and destructive-action approval disabled. It reused the CLI's registration, installation, dry-run planning, signed uploads and manifest sync; it did not implement a separate installation protocol.

All six phases completed: build, registration, installation, preview, upload and sync. Fifteen files totaling 2,612,392 bytes uploaded successfully. The build content hash is `750d2173f0887f70273a444ec27e4aeff6660808104b4186605b85c57036c24f`. All three installed component checksums match their artifact files, and a fresh post-install plan has zero changes.

The artifact transfer was interrupted before any live mutation. Its partial byte count was checked, transfer resumed from that offset, and the complete archive SHA-256 was verified before extraction. Production SSH access and saved CLI credentials remained on the Mac and production host. Private artifact, installation and verification evidence remain in their release state directories outside Git.

## Cutover And Backups

[Owner authorization](../decisions/better-lists/0010-deploy-to-live-crm.md) approved this rollout. No new core schema migration or cron registration was needed. Automatic database migration and cron registration settings stayed disabled, and APP_VERSION remained 2.61.0.

Application writes stopped at 18:37:43 UTC. Both existing offsite backup jobs passed before cutover: pgBackRest finished at 18:38:17 UTC and restic at 18:38:00 UTC, with successful service results and exit status zero. Only the server and worker image pins changed. The exact resolved Compose configuration excluding those pins matched its baseline, and environment hashes, mounts and network membership were preserved. Database and Redis retained their original containers. No local database dump or upload backup archive was created, and no images or volumes were pruned.

The new core passed its cutover checks at 18:38:47 UTC. The helper retained automatic restoration of the prior image on failure; rollback was not needed. Post-installation offsite backups also passed: pgBackRest finished at 18:43:14 UTC and restic at 18:43:17 UTC, both with successful service results and exit status zero.

## Verification And Limits

- Server healthy; worker running; both on the pinned image with zero restarts at verification. Database and Redis remain healthy.
- Local, shared-login and public workspace health checks returned HTTP 200.
- All 1,083 shell-referenced JavaScript/CSS asset requests passed. The public entry asset hash matched its deployed container file. The compiled Better Lists metadata chunk also loaded publicly with a matching hash; lazy-loaded assets are not assumed to appear under a particular filename in the initial HTML.
- Authenticated CLI metadata verified the three commands, USER-scoped Lists menu, three front components and component checksums, preservation of all prior apps and objects, and the zero-change post-install plan.
- The preferences feed and front-component user-token endpoint intentionally reject OAuth CLI callers. Their access policy was respected; verification used the supported installed-application metadata relations instead. No authenticated production browser interaction or fresh browser-token test is claimed.
- No CRM test records, analytics refresh, history import or notifications were created by these checks.

The [implementation handoff](2026-11-22-better-lists.md) records prior preview browser checks, service and guard tests, app and frontend checks, and the server typecheck memory limit. Those checks predate this deployment. The existing limits remain: List Entries is an editable maintained multi-select, metadata creation/rename spans multiple mutations, and the legacy native creation path has a failed-setup cleanup edge. This release does not resolve those limits or make the SDK app independent of the fork.

Hindsight remained unavailable because this VM lacks its private profile. The verified release facts are retained here; no external-memory write is claimed.
