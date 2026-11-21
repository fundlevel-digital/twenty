# 0007. Open The Rebuild Pull Request

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [0001](0001-keep-our-app-and-use-native-messaging.md), [0004](0004-cloud-preview-and-simulated-provider-checks.md)

## Context

The rebuild, isolated preview verification and decision documentation were complete.
The branch also contains the original Fundlevel LinkedIn app commits, so the pull
request needs to describe the complete diff against main.

## Exchange

- 2026-11-21 Agent: reported the completed Ruler/decision setup, 821-message preview migration and 302 passing tests, with attachment/ownership limitations documented.
- 2026-11-21 Kareem: "Create a PR .context/attachments/eBftXZ/PR instructions.md"
- 2026-11-21 Attached instructions: commit reviewed workspace changes, push the existing branch and create a pull request against main with a concise description of the complete diff.

## Decision

Commit the reviewed changes on `fundlevel/linkedin-sync-app`, push that branch and
open its pull request against `main`. Preserve the branch name. This request does
not authorize merging the PR or deploying the rebuild to production.

## Why

Kareem requested a reviewable pull request for the current code.

## Consequences

The PR covers the native LinkedIn messaging rebuild, configurable contact creation
and employee handling, sync/migration/retirement tooling, delegated share-key fix,
and Ruler-managed guidance with LinkedIn decision records. Private preview data,
credentials, screenshots and transcript attachments remain outside the commit.

## Evidence

The repository handoff records 287 app tests, 12 legacy mapping/signature tests,
three core share-key tests, direct app typecheck/lint, migration-stage/final builds
and actual CRM checks using saved data and simulated provider responses. The
preview matched all 821 source messages before retiring legacy objects; six
original attachments are unavailable and 237 messages await confirmed ownership.
