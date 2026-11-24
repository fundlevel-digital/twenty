# 0018. Resume And Verify The Live Sync Repair

- Date: 2026-11-24
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Original Repair Authorization](0017-complete-the-live-sync-repair.md), [Repair Handoff](../../../../../handoffs/2026-11-23-plusvibe-sync-repair.md)

## Context

PR #39 merged the app safeguards, but the previous session could not complete
native inbox-link maintenance because the Mac SSH agent and command bridge failed.
The owner continued that session from its attached transcript.

## Exchange

- 2026-11-24 Agent: identified the live repair and Cold/Ghosted dashboards as the two continuation choices, and checked existing private recovery checkpoints.
- 2026-11-24 Kareem: "Resume the PlusVibe sync repair"
- 2026-11-24 Agent: restored the maintenance connection, committed the guarded association repair, verified source coverage and preserved records, corrected cached reply flags, and resumed paced history recovery. A reproduced campaign sender lookup error required an app-only participant connection fix.

## Decision

Continue the existing live PlusVibe repair and verification. Preserve the original
messages and selected Person links, enforce owned-inbox evidence, and distinguish
scheduled history from completed imports.

## Why

The owner selected the unfinished repair as the next task. Dashboard counts need
complete history and correct incoming/outgoing classification.

## Consequences

The 1,480-association transaction committed and its persisted values were checked
against the plan. All 362 previously pending source identities are present. The
API and database independently verified 1,842 messages, all 15,814 exported leads,
and zero changes to 7,241 selected Person links or original message contents and
thread links. Forty cached thread reply flags were corrected. Seventeen messages
remain preserved with unresolved owned-inbox attribution.

The deployed campaign sender lookup now selects and traverses participant
connections through `edges.node`, matching the verified live API. Tests use that
response shape and also verify that an unrelated participant cannot establish a
sender. App deployment used `--no-prune`: three function checksum updates, zero
metadata creates/deletes/destructive actions. No host code was deployed.

The guarded `retry-history-page` operation preserves the failed cursor and run,
rejects superseded runs and non-history failures, uses a short distinct queue ID,
and restores the failed checkpoint if scheduling fails. The final app-only
plan/apply contains six function checksum updates with no destructive actions.
Campaign jobs were slowed after live HTTP 429 responses; full history completion
remains pending.

## Evidence

- [Handler](../../../../../../packages/twenty-apps/public/plusvibe/src/logic-functions/lead-emails.ts)
- [Regression Tests](../../../../../../packages/twenty-apps/public/plusvibe/src/__tests__/lead-emails.test.ts)
- All 174 tests across 23 files, direct TypeScript and changed-file Oxlint passed.
- Private checkpoints, snapshots and deployment results remain on the owner's Mac
  under `/tmp/twenty-plusvibe-sync-fix/`; no customer records or credentials are
  included here. Current recovery progress and limits are in the linked handoff.
