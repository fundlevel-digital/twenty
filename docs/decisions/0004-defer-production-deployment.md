# 0004. Defer Production Deployment

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: release operations
- Related: [0002](0002-preview-before-production-deployment.md)

## Context

PR #8 was merged, and the owner requested deployment after confirming that the
preview changes were not live.

## Exchange

- 2026-11-21 Kareem: "ok, please deploy"
- 2026-11-21 Agent: confirmed the merged commit and inspected production access,
  running containers, configuration and backup status.
- 2026-11-21 Kareem: "actually dont worry abt deploying"
- 2026-11-21 Agent: stopped deployment preparation and revoked temporary access.

## Decision

Leave production on its existing release. Do not continue this deployment.

## Why

The owner's latest instruction withdrew the deployment request.

## Consequences

No release build, service replacement, database migration or production data
change was performed. The temporary deployment SSH authorization was removed,
and its local private and public key files were deleted.

## Evidence

- [PR #8](https://github.com/fundlevel-digital/twenty/pull/8) merged as
  `c62fc55d3ec72905d80fd0a9ca0eab02989bdbd9` at 2026-11-21T17:00:47Z.
- Production inspection still showed image
  `fundlevel-twenty:4f27f1a4d2-relation-picker` for server and worker.
- The temporary-key removal command verified that its authorization was absent.
