# 0020. Harden And Deploy Normal Sync Recovery

- Date: 2026-11-24
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Reliability Requirement](0019-require-durable-sync-reliability.md), [Continuation](0018-resume-and-verify-live-sync-repair.md)

## Context

The agent explained that specific mapping bugs were fixed, but temporary queue
pacing did not make normal imports resilient to throttling or interruptions.
Known-case test passes did not establish the requested reliability outcome.

## Exchange

- 2026-11-24 Agent: identified persistent coordinated rate control, automatic
  durable recovery, actionable failure reporting, source-to-CRM completeness
  verification, and committing deployed changes as remaining work.
- 2026-11-24 Kareem: "Ok fix all dat'"
- 2026-11-24 Kareem, after a Mac bridge timeout: "It is open and connected—retry"
- 2026-11-24 Agent: implementing and testing these changes inside the PlusVibe
  application, then deploying through the existing no-prune app workflow.

## Decision

Complete the stated reliability work, including verification and preserving the
fixes in version control. Keep changes app-only and preserve original messages
and selected Person links.

## Why

The owner authorized the remaining work after explicitly requiring protection
against a repeated incomplete import incident.

## Consequences

The implementation uses an app-owned job object for durable state and conditional
updates for an exclusive worker lease. Raw source inputs remain in private
application storage. Discovery persists source work before advancing pagination;
record rejection does not stop unrelated source records. A recurring supervisor
recovers abandoned tasks. Completion requires persisted record identity readback,
and settings distinguish outstanding imports, failures and completion.

These implementation choices are the agent's response to the authorization, not
separately quoted owner design decisions. Intended, tested and deployed states
are tracked in the implementation handoff. No host/fork code deployment, provider
campaign enrollment or email sending is authorized by this record.

## Evidence

- [Reliability Handoff](../../../../../handoffs/2026-11-24-plusvibe-durable-sync.md)
- [Durable Worker](../../../../../../packages/twenty-apps/public/plusvibe/src/logic-functions/sync-worker.ts)
- [Durable Job Storage](../../../../../../packages/twenty-apps/public/plusvibe/src/logic-functions/utils/sync-jobs.ts)
