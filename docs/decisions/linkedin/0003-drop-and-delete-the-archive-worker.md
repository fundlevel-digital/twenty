# 0003. Drop And Delete The Archive Worker And D1

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [area index](DECISIONS.md), [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)

## Context

The old app archived provider payloads in a Cloudflare Worker/D1 service in
addition to Twenty. The rebuild could keep that archive or store imported data
and resumable state in Twenty.

## Exchange

- 2026-11-21 Kareem, when offered the archive alternatives: "simpler"
- 2026-11-21 Kareem: "skip it yeah"
- 2026-11-21 Agent: removed D1 client, variables and Worker source from the rebuild.
- 2026-11-21 Kareem: "also delete the worker/d1"

## Decision

Use Twenty for imported data and resumable sync state. Remove the D1 dependency
and delete the deployed archive Worker and its D1 database. Preserve the signing
secret needed by direct Unipile webhook delivery.

## Why

Kareem chose the simpler architecture and separately authorized deletion of the
actual external resources.

## Consequences

The Worker `fundlevel-unipile-archive` and D1 `unipile-archive` were deleted from
Cloudflare. This is an actual external change despite the preview-only rebuild.
Production CRM code was not deployed. Direct webhook delivery still needs to be
configured and verified during any future production cutover.

## Evidence

Authenticated Wrangler deletion succeeded for both resources. Follow-up Worker
deployment lookup returned Cloudflare 10007 (Worker does not exist); D1 lookup
could not find the database. Verification is recorded in the authenticated tool results of this Conductor
session; no credentials are reproduced here.
