# 0002. Preview Before Production Deployment

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: cross-cutting; release review and local runtime
- Related: [0001](0001-upstream-and-computed-field-editor.md), [0003](0003-ruler-decisions-and-session-documentation.md)

## Context

The upstream integration and missing UI were implemented locally. The owner
requested a fork merge and deployment, then inserted a preview step before that
release work.

## Exchange

- 2026-11-21 Kareem: "merge to fork & deploy"
- 2026-11-21 Kareem: "Actually, first - please setup a conductor preview w/ the twenty instance hosted on ur machine; u can use our prod data/config/secrets/etc. to seed"
- 2026-11-21 Agent: restored a production snapshot into isolated local PostgreSQL and storage, upgraded only the clone, and exposed the current branch through Conductor.
- 2026-11-21 Agent: kept background workers stopped, redirected runtime URLs to the preview, configured preview-only sign-in and disabled outbound integration behavior for the clone.
- 2026-11-21 Kareem: reviewed the preview and requested the upstream expression editor, recorded in 0001.

## Decision

Provide the current branch as a remote Conductor preview seeded from production
before proceeding with the requested fork merge and production deployment. The
preview is a separate runtime; the seeding permission does not make its writes
production writes.

## Why

The owner explicitly requested previewing first and authorized production data,
configuration and secrets as seed inputs. Isolation measures were the agent's
implementation choices to make that review practical without running copied
integrations against production services.

## Consequences

- The preview has its own database, Redis and uploaded-file storage.
- Database upgrades ran against the restored clone, not production.
- Preview URLs and domain routing were adjusted locally, including disabling
  copied custom-domain redirects.
- Background workers remain stopped; emailing logs locally. OAuth providers,
  billing, telemetry and marketplace synchronization were disabled in the
  preview configuration.
- Temporary production exports and download keys were removed after transfer.
- Preview credentials and runtime secrets remain in ignored local files and
  must not be copied into this record.
- As of this session's handoff, the branch changes were committed locally.
  Merging into fork main and deploying production remained pending.

## Evidence

- Preview: <https://fundlevel-w903.conductor.show/>; this URL belongs to the
  Conductor workspace and is not a permanent deployment.
- Final runtime: backend port 3000, optimized frontend port 3004.
- Database instance and workspace upgrades completed successfully on the clone.
- The upload snapshot checksum matched before restoration; approximately 9.7 GB
  of uploads were restored locally.
- `/healthz` returned `ok`; browser sign-in, formula persistence and calculated
  results on ten cloned company records were verified.
- [Session handoff](../handoffs/2026-11-21-computed-fields-and-preview.md) records
  implementation state and workspace-local verification artifact locations.
