# 0015. Merge The Confirmed Duplicate Into The Existing POC

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Previous identity review](0014-preserve-selected-person-and-flag-identity-review.md)

## Context

The previous instruction retained a disputed Lead relation pending review.
Kareem subsequently confirmed that the apparent second identity was an incorrect
name for the existing influencer POC.

## Exchange

- 2026-11-23 Kareem: "anyways, they're the same person, drew was just the wrong name, so it should be merged into tris"
- 2026-11-23 Agent: merge the duplicate into the existing POC, retaining the POC's
  record and completing the identity review.

## Decision

Supersede 0014. Merge the incorrectly named duplicate into the existing POC using
the POC as the priority record. Preserve email addresses and related records,
restore the Lead's Matched status and complete the review task.

## Why

The owner explicitly confirmed that both records represent the same person and
identified which record should survive.

## Consequences

The live merge retained the existing POC record, name and both email addresses.
One PlusVibe Lead transferred to it. The duplicate is no longer active, the Lead
is Matched, and the review task is Done with its relation consolidated onto the
surviving Person. The POC's calculated outreach status now confirms source sends.

The ordinary REST and GraphQL merge attempts rolled back: the native merge runner
included calculated outreach fields in its write payload, producing PostgreSQL
42703 for `outreachPlusvibeLeadCount`. An isolated maintenance process invoked the
existing authenticated native merge handler with calculated fields excluded from
the merge payload. Its preview passed before applying the native transaction and
relation migration. No deployed source, schema or service was changed. The normal
merge endpoint still needs a separate computed-field fix.

## Evidence

Live API readback on 2026-11-23 verified the survivor's name and email preservation,
the transferred Lead relation, the duplicate's absence, Matched status, Done task
and consolidated task relation. The POC reports one source-send Lead and confirmed
outreach. Workspace-wide dashboard totals were not recalculated for this update.

Private before-state, previews, maintenance script and execution/readback evidence
remain in the owner's Mac dashboard session directory. Customer record data and
credentials were not copied into this record. Hindsight remains unavailable in
this checkout; no memory retention is claimed.
