# 0007. Deploy The Merged Twitter Refresh Controls

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Twitter Analytics
- Related: [refresh controls](0006-configurable-refresh-and-profile-enrollment.md), [earlier preview scope](0004-preview-scope-and-backfill-explanations.md)

## Context

PR #26 merged the preview follow-ups, native controls, configurable scheduling,
manual refresh workflow and profile enrollment. Kareem authorized live deployment,
then requested rebasing to main before continuing.

## Exchange

- 2026-11-22 Kareem: "go ahead and deploy to live"
- 2026-11-22 Kareem: "Wait, rebase to main again"
- 2026-11-22 Agent: rebased the current continuation branch onto main at `998de330d9`, then installed the merged Twitter app through the existing live CLI connection.
- 2026-11-22 Kareem: "When u merge, u can deploy to the live CRM"

## Decision

Deploy the merged Twitter app update after rebasing to current main. Kareem also
explicitly permits live CRM deployment after merging approved changes in this
session, without a separate confirmation. The previous preview-only stage is
complete for these merged changes. The standing session instruction is quoted
here as evidence; this record does not itself authorize unrelated future work.

## Consequences

The existing Twitter app was upgraded in place using CLI 2.59.0 and the existing
Fundlevel remote on the Mac. The reviewed plan created ten metadata entities and
updated seven, with zero deletions, destructive actions or cascades. No host
server or worker deployment was needed. Scheduling retains daily 05:00 UTC,
and all 235 existing profiles retain disabled enrollment and Influencer links.
The native refresh workflow is active and the automatic dispatcher initialized
its saved schedule window. No paid analytics batch or new backfill was run.

## Evidence

- [Merged PR #26](https://github.com/fundlevel-digital/twenty/pull/26), commit `eb4afbe5b2f19d920a4b8ca60b1ca81ef490d1be`.
- Release checkout: main commit `998de330d9`; app content hash `5053dc140b1aba1809d894bbca45a0d08b0634febdeff74810965005094bc9e9`.
- Native before/after audit: all 235 profile IDs, enrollment values, Influencer relations and successful-refresh timestamps match; all existing preference values match.
- Active native refresh workflow, authenticated relation-settings HTTP 200, automatic schedule marker initialized, and shared-login/workspace health HTTP 200.
- Fresh post-install plan: zero creates, updates, deletions, destructive actions or cascades.
- Private release evidence remains on the Mac outside Git; no credentials or customer records were copied into documentation.
- See the [release handoff](../../handoffs/2026-11-22-twitter-analytics.md).
