# 0019. Require Durable Sync Reliability

- Date: 2026-11-24
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Repair Continuation](0018-resume-and-verify-live-sync-repair.md), [Repair Handoff](../../../../../handoffs/2026-11-23-plusvibe-sync-repair.md)

## Context

The app's specific sender-lookup fix was deployed and the old inbox associations
were repaired. The history backlog is still importing. Slowing already queued
jobs is an operational mitigation; normal import scheduling still uses
three-second increments and finite retries can leave a failed checkpoint.

## Exchange

- 2026-11-24 Kareem: "What was the actual root cause? And did we fix it? Like is the app fixed? I can't have this happen again"
- 2026-11-24 Agent: distinguished deployed bug fixes and verified data repairs from incomplete recovery and missing permanent rate control. The original lead-write HTTP 400 cause remains unproven because its detailed response was not retained and the rejection was not reproduced.

## Decision

The requested outcome is a durable app repair that prevents recurrence, beyond
one-time data restoration and queue changes. Do not characterize the app as fully
fixed while normal imports can still fail under the same request budget.

## Why

The owner explicitly requires protection against a repeat incident.

## Consequences

Agent assessment, not a separately owner-approved implementation design: normal
imports need coordinated rate control, durable resumable recovery, actionable
failure reporting, and source-to-CRM completeness verification. Verification needs
to exercise rate limits and interrupted/restarted imports with real API response
shapes. Existing known-case unit test passes alone do not establish reliability.
No further implementation or deployment is claimed by this record.

## Evidence

- `backfill.ts` schedules campaign history with three-second increments and writes
  a failed checkpoint after retry exhaustion.
- `lead-emails.ts` records an exhausted job failure marker; that is not a completed
  historical import reconciliation.
- The deployed `retry-history-page` is an administrator-invoked recovery operation,
  not an automatic recovery supervisor.
- [Maintained Repair Handoff](../../../../../handoffs/2026-11-23-plusvibe-sync-repair.md)
  separates preserved records, deployed fixes and pending history work.
