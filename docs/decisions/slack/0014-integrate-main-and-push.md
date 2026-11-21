# 0014. Integrate Main And Push The Slack Branch

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [0013](0013-open-slack-pull-request.md), [integration handoff](../../handoffs/2026-11-21-slack-main-integration.md)

## Context

Draft PR #10 contains the Slack MVP on a tested Twenty 2.60 baseline. Main has advanced to 2.61, including messaging API, upgrade-command and shared documentation changes. Integrating main was an outstanding review prerequisite.

## Exchange

- 2026-11-21 Kareem: "Merge the remote branch (main) into your branch and resolve conflicts. Then, commit and push your changes."
- 2026-11-21 Agent: integrated freshly fetched main, reconciled the Slack implementation with 2.61 and ran focused checks before committing and pushing the existing branch.

## Decision

Merge remote main into `fundlevel/slack-sync-app`, resolve conflicts, then commit and push that branch. This authorizes branch integration and updating the existing review artifact; it does not authorize merging the PR into main or deploying the live CRM.

## Why

The owner explicitly requested these actions after the PR identified upstream integration as outstanding.

## Consequences

Preserve main's Ruler sources, other applications' documentation and messaging changes. Adapt Slack subscriptions to the common query parser, selected-field visibility contract and event identity. Register the unmerged Slack upgrades under current version 2.61 with fresh append-only timestamps, preserving their schema operations and main's historical commands. Keep the existing VM preview isolated on its verified pre-merge snapshot.

## Evidence

Integrated main commit: `a691dd35aa6db0df6315bd4555b9bbb038fa0fc1`. Review: [PR #10](https://github.com/fundlevel-digital/twenty/pull/10). Fresh checks pass 330 focused tests; app and scoped frontend typechecks pass. Expanded scoped server typechecking reports unrelated semver declaration and error-status diagnostics in files unchanged from main. Detailed validation, upgrade paths and runtime limits are in the linked handoff.
