# 0013. Open the Slack work for review

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [0012](0012-keep-slack-branch-scoped.md), [Slack implementation](../../slack-sync.md)

## Context

The Slack MVP is running in the VM preview and has not been deployed to the live CRM. The owner asked for a pull request with the current implementation. Main advanced from the branch's tested Twenty 2.60 baseline to 2.61 during the work, including separate Ruler and decision documentation changes.

## Exchange

- 2026-11-21 Kareem: "Is evrything deplloyed on my live crm?"
- 2026-11-21 Agent: confirmed that the Slack work is only in the VM preview and that live deployment/OAuth setup remains outstanding.
- 2026-11-21 Kareem: "Create a PR"
- 2026-11-21 Agent: reviewed the workspace, reran focused tests and chose a draft PR to expose the approved current state while identifying integration with the new main as unfinished. Draft status is an agent readiness judgment, not an additional owner instruction.

## Decision

Commit the current Slack implementation and open a pull request against main. This request authorizes the review artifact, not a production deployment or merge.

## Why

The owner's attached PR instructions say that the current code is approved for a PR, require reviewing and committing the workspace changes, and specify main as the target.

## Consequences

The PR includes the Slack app, native messaging/SDK/CLI support, privacy and contact creation, native preferences/record UI, upgrade commands and the explicitly requested Slack decision/Ruler documentation. Integration with main's Twenty 2.61 code and upgrade-command requirements remains a prerequisite to merging. Existing decision and preview work already merged into main must be preserved during that integration.

## Evidence

PR instructions: `.context/attachments/wleoY5/PR instructions.md`. Branch: `fundlevel/slack-sync-app`. Main at review: `c62fc55d3e`. The branch contains version 2.60 upgrade commands while current main declares `TWENTY_CURRENT_VERSION = '2.61.0'`. Fresh validation is captured in the session handoff and PR description; no claim is made that current-main integration or live deployment has passed.
