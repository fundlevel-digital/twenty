# 0002. Merge, Install And Backfill The Live CRM

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: twitter-analytics
- Related: [App And Preview](0001-native-twitter-profiles-and-preview.md)

## Context

Kareem reviewed the preview and asked to install the app and relate the existing
Influencers' Twitter accounts. He then clarified that main should receive the
code first.

## Exchange

- 2026-11-22 Kareem: "Alright, this looks good."
- 2026-11-22 Kareem: "Go ahead and install it on the Live CRM; and then backfill all the influencer relations"
- 2026-11-22 Kareem: "Create a PR .context/attachments/8YdxWj/PR instructions.md"
- 2026-11-22 Kareem: "Yeah soryy, merge to main first"
- 2026-11-22 Agent: prepares the PR and merge before live app installation, then plans to import existing Influencer handles and URLs while preserving existing profile parents.

## Decision

Create and merge the PR into main first. Then install the merged app on the live
CRM and backfill Twitter Profiles and their Influencer relations from existing
Influencer Twitter/X fields. Preserve existing profiles and relationships.

## Why

Kareem approved the preview and explicitly specified merge before installation.

## Consequences

This authorizes the live app installation and CRM relation backfill. It does not
require a paid analytics refresh of every imported account; imports themselves
make no external TwitterAPI.io calls and retain disabled scheduled calculation
for newly imported profiles. Installation and backfill outcomes are recorded
separately from source merge status.

## Evidence

- This conversation, 2026-11-22, following preview acceptance.
- [App source](../../../packages/twenty-apps/internal/twitter-analytics/README.md).
- [Handoff](../../handoffs/2026-11-22-twitter-analytics.md), including subsequent rollout status.

- [Merged PR #19](https://github.com/fundlevel-digital/twenty/pull/19) and the handoff's final production audit: installed after merge, 479 Influencers processed, 235 profiles related, four duplicate claims preserved, no duplicate profile handles.
