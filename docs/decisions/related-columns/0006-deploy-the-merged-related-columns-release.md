# 0006. Deploy The Merged Related Columns Release

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [PR Publication](0005-open-the-reviewed-workspace-pull-request.md)

## Context

PR #21 merged as `1913516c9b8e4b3177c9ccb50412b551a300c9f3`.
The approved core UI has been verified on the isolated VM preview. The related
influencer/channel data and pricing operations were completed separately.

## Exchange

- 2026-11-22 Kareem: "Okay, go ahead and deploy live"
- 2026-11-22 Branch continuation attachment: the PR is merged and this workspace
  has moved to `conductor/untitled-v4` from main.
- 2026-11-22 Agent: confirmed the merge and the exact-commit image build; proposed
  checking the current production deployment and rollback inputs before cutover.

## Decision

Deploy the merged release to the existing live Twenty stack, then verify its
health and the related-column frontend. Preserve production configuration,
workspaces and data. Do not repeat the already-completed CRM data migration or
trigger analytics batches as part of this core UI deployment.

## Why

The owner explicitly approved production deployment after merging and preview
review.

## Consequences

Use the exact merged commit's release image and the existing production deployment
procedure. Keep the prior image available for rollback and verify whether any
schema upgrade is required before changing services. The production outcome is
recorded separately after verification.

## Evidence

- [Merged PR #21](https://github.com/fundlevel-digital/twenty/pull/21).
- [Exact-commit image build](https://github.com/fundlevel-digital/twenty/actions/runs/45046896299).
- [Prior production rollout procedure](../../handoffs/2026-11-21-live-crm-rollout.md).
- [Production deployment and verification](../../handoffs/2026-11-22-related-columns-live-release.md): the exact merged image is deployed to server and worker, with unchanged database and Redis containers and passing authenticated API checks.
