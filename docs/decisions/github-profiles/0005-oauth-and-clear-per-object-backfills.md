# 0005. Prefer OAuth And Make Backfill Settings Clear

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Shared Relations And Key Pool](0003-many-to-many-source-workflows-and-key-pool.md)

## Exchange

- 2026-11-22 Kareem: "Does this have to be API key, or can it just be oauth? I'd prefer OAuth."
- 2026-11-22 Kareem: "If API key is needed, please add decscription of how to get it"
- 2026-11-22 Kareem, with settings screenshots: "I don't like how its the field's id instead of actual names and shi, also it seems to be empty"
- 2026-11-22 Kareem: "how would I configre it to be all?"
- 2026-11-22 Kareem: "select options seems to be empty, and Idk what the options mean"
- 2026-11-22 Kareem: "this should be configurable per record type"
- 2026-11-22 Agent: the screenshot shows a failed authenticated `/s/` request.
  The host fetch policy deliberately omits auth-proxy cookies on those routes;
  use native metadata execution for app controls instead. Replace portal selects
  with labelled native selects, describe modes, and save source-specific backfill
  preferences with an explicit All Records scan.

## Decision

Prefer GitHub OAuth; retain personal access tokens as an optional fallback with
setup instructions. Preserve pooled credentials and shared GitHub account quota
handling. Show field names, explain sync modes, offer All Records, and save
backfill mode and scan size independently for People and Companies.

## Implementation

The OAuth provider references administrator-configured `GITHUB_CLIENT_ID` and
secret `GITHUB_CLIENT_SECRET`, requests no additional scopes, and uses native
PKCE/state handling and encrypted connections. The existing token provider and
its connections keep their identifiers. OAuth credentials are tried first.

The Sync page provides OAuth registration/configuration steps, its exact callback
URL, and fine-grained personal-token creation instructions. Native metadata
execution replaces `/s/` calls from front components. Loading errors block editing
and offer Retry instead of showing UUIDs with empty options. The host cookie
policy remains unchanged. Execution requires the native Workflows permission;
backfill management also checks Applications permission.

All Records scans in checkpointed background pages. Scanning does no GitHub work
and ends at a reviewable plan; the owner must still select Run Backfill. Cancellation
is respected while scanning. A custom cap reports truncation. Saved backfill mode
and scan size belong to each source independently.

## Scope And Evidence

Source and isolated preview only; no production deployment or real credential
configuration is authorized by this record. See the maintained
[README](../../../packages/twenty-apps/internal/github-profiles/README.md) and
[handoff](../../handoffs/2026-11-22-github-profiles-preview.md) for checks and limits.
OAuth registration credentials are required before a real GitHub authorization
can complete; an installed provider alone is not proof of successful OAuth.
