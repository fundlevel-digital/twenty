# NanoInfluencer Live Release — 2026-11-22

## Release And Scope

[PR #28](https://github.com/fundlevel-digital/twenty/pull/28) merged as
`a8ecf7ada1c366e67eee792a9aeb0125197f17d2`. Kareem authorized live deployment
in [decision 0012](../decisions/nano-influencer/0012-deploy-merged-release-to-live-crm.md).

Server and worker now use
`ghcr.io/fundlevel-digital/twenty:a8ecf7ada1c366e67eee792a9aeb0125197f17d2`,
digest `sha256:77be3fa315dcd793b11205658c715f4921a23e63f3d5409faa1ebb3571e1e5ec`.
The [release build](https://github.com/fundlevel-digital/twenty/actions/runs/45069307183)
passed. The previous Better Lists image remains available for rollback.

The host changes add descriptions, hidden retry inputs, readable enum labels and
saved connection selection to workflow forms. The production image includes the
actual merged frontend; it does not use the preview's older-server compatibility
proxy or protected-route aliases. No core schema migration or cron-registration
command was required. APP_VERSION remains 2.61.0, and automatic startup migrations
and cron registration remain disabled.

## Cutover

The supervised cutover stopped application writes and verified the existing
pgBackRest incremental and restic file/configuration offsite jobs before changing
the two image pins. No local database dump or upload archive was created.
Application writes were stopped at 21:14:28 UTC, both offsite backups were
verified by 21:15:25 UTC, and the new core passed health and preservation checks
at 21:15:58 UTC. The helper retained automatic restoration of the prior image on
failure; no rollback was needed.

Resolved Compose configuration, excluding only server/worker image pins, matches
the baseline. Container environment hashes, mounts, networks and port bindings
match. Database and Redis kept their original containers. Local, shared-login,
Fundlevel and Sunny health checks passed, and server/worker had zero restarts at
cutover verification. Production SSH and CLI authentication stayed on the Mac
and production host.

Post-release offsite backups completed after the enum backfill: restic finished
at 21:30:05 UTC and pgBackRest at 21:30:18 UTC, both with successful service
results and exit status zero. All four health endpoints passed again. The server
is healthy, worker running, database/Redis healthy, and all four containers have
zero restarts at final verification. The temporary failed-pull registry
configuration was removed; existing production authentication remains intact.

## Installed Applications

The exact merged SDK app definitions were built in an isolated Mac release
worktree with immutable app dependencies. LinkedIn retained its migration-stage
templates and permissions; its deferred account/history migration was not run.
All application plans and applies disabled pruning and contained zero deletes,
destructive actions or cascades:

| App | Creates | Updates |
| --- | ---: | ---: |
| NanoInfluencer | 856 | 0 |
| Cal.com | 11 | 3 |
| LinkedIn Sync, Migration Stage | 22 | 31 |
| Slack Sync | 8 | 4 |
| PlusVibe | 17 | 6 |

Fresh native post-install plans report zero changes for all five applications.
All 16 prior apps and 84 prior objects retain their identifiers. Nano is the
seventeenth app and adds six objects, bringing the object total to 90. The live
installation has 11 commands, 17 logic functions and 12 front components.

Nano's live application ID is `76daa7af-8055-438d-9fef-c56aa29df6af`.
Native metadata verifies the global Find Nano Lookalikes command and its workflow
schema: Lookalike Seed, saved API Connection descriptor, hidden retry key and
readable country enum labels. Safe defaults are Manual Only sync, no automatic
People creation and Keep for removed lists and memberships. All six Nano
collections were empty at verification. Preview records, connections, secrets
and preferences were not promoted to production.

## Tooling Corrections

The published 2.59/2.60 CLI rejects Slack's channelObject reference as a duplicate
definition. The merged 2.61 CLI already excludes that reference from duplicate
definition validation. An isolated copy of the published 2.60 tooling carries
that exact exclusion; actual duplicate-definition checks and native metadata
planning remain enabled. No app definition was edited for this compatibility
adjustment. The successful reference fix, plans and zero-change follow-ups are
kept with the private release evidence.

The registry pull initially used root without registry credentials, then a Mac
GitHub token without package-read scope was denied. The existing production
user's registry login pulled the pinned image successfully. No new OAuth scope
or registry credential was needed, and no existing credential was replaced.

Preflight also caught the enum backfill CLI guessing plusvibeActivitys instead
of the registered plusvibeActivities. The operator now reads canonical plural
names from validated field/object metadata and checks target object ownership.
Its regression covers dry-run behavior, the irregular plural and preservation
of populated selections; all four operator tests pass. This correction changes
the deployment operator, not the merged application artifacts or core image.

## Enum Backfill And Preservation

The reviewed dry run found 2,482 records with missing categorical values.
The native API backfill applied exactly those 2,482 updates, without provider
requests or overwriting populated selections:

| Object | Examined | Updated |
| --- | ---: | ---: |
| Cal.com Booking | 100 | 100 |
| Nano Creator | 0 | 0 |
| Message Thread | 8,646 | 799 |
| PlusVibe Activity | 0 | 0 |
| Message, Slack Attachment State | 18,356 | 5 |
| LinkedIn Account | 2 | 2 |
| LinkedIn Connection | 1,576 | 1,576 |

Record updates were rate limited, with bounded retries for rate-limit responses.
A subsequent dry run reported zero remaining updates in every collection.
Before/after count and digest audits match for IDs and original raw categorical
values across all six existing audited collections; the new Nano collections
remain empty. No raw customer rows were copied into the cloud VM or these docs.

Public frontend verification passed all 1,085 shell-referenced JavaScript/CSS
assets, with zero failures. The public entry asset hash matches its deployed
container file. This verifies the served release alongside the native schema
and command checks; it is not an authenticated browser interaction.

## Verification Boundaries

Native metadata, native record queries, deterministic app plans and pinned core
health checks verify installation. No production browser interaction, live Nano
avatar upload, enrichment request, paid discovery or provider history import was
performed. Cross-app social-profile linking remains workspace-owned automation,
as settled in decision 0011; this release does not create that workflow.

Connect Nano through
[live app settings](https://crm.fundlevel.co/settings/applications/76daa7af-8055-438d-9fef-c56aa29df6af),
then choose the desired manual sync and review
[Nano preferences](https://crm.fundlevel.co/settings/app-preferences/76daa7af-8055-438d-9fef-c56aa29df6af).
Native connection listing is reserved for supported user-session callers;
verification did not bypass that policy or claim a live connection count.

Private artifacts, plans, audit digests and logs remain in the isolated Mac
release directory referenced by `~/.twenty/.nano-influencer-live-release-path`
and the private host release state. Credentials and customer record contents
are excluded from this document. Hindsight remains unavailable because the
private profile/repository metadata is missing; no remote retention is claimed.
