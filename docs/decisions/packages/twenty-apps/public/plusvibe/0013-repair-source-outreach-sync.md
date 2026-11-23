# 0013. Repair Source Outreach Sync

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Historical Audit](0012-audit-outreach-coverage-against-attio.md)

## Context

The historical audit and full PlusVibe export established 265 influencers with
source send evidence absent from imported native messages. Their POC emails
remained related in Twenty. The workspace import checkpoint was failed.

## Exchange

- 2026-11-22 Kareem: "fix it"
- 2026-11-22 Agent: repair the app's sync ordering, restore real source leads
  to existing POCs and use source outreach evidence alongside native messages.

## Decision

Repair and deploy the PlusVibe application and the existing workspace dashboard.
Restore actual provider records and verify coverage against the supplied export.
Ranking remains deferred under decision 0011.

## Why

Kareem requested repair after confirming that existing PlusVibe outreach had
not been fully imported into Twenty.

## Consequences

The app stores source last-send dates, latest sent step, reply count, sequence
completion and send evidence independently of native email-body availability.
Lead directory discovery precedes message history. Targeted administrator
refreshes retrieve actual source IDs and retain the existing Person matching
and ambiguity rules. Conditional REST thread updates retain concurrency checks.
No sender address is fabricated for historical messages lacking one.

The dashboard's outreach confirmation combines source lead evidence, native
sends and native replies. Imported message counts remain distinct from source
sequence steps and completed sequences. These are implementation choices under
the repair authorization, not separately specified owner requirements.

## Evidence

The [audit handoff](../../../../../handoffs/2026-11-22-attio-outreach-backup-audit.md)
records source evidence. Repair deployment and verification are tracked in the
[repair handoff](../../../../../handoffs/2026-11-22-plusvibe-outreach-repair.md).
