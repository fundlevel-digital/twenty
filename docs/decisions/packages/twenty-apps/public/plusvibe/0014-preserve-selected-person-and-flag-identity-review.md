# 0014. Preserve The Selected Person And Flag Identity Review

- Date: 2026-11-23
- Status: superseded by 0015
- Decided by: Kareem
- Area: PlusVibe
- Related: [Source outreach repair](0013-repair-source-outreach-sync.md)

## Context

The source outreach repair left one identity discrepancy: a source Lead's name
differed from the influencer POC sharing its email. The source lacked an original
Person identifier and archived evidence did not resolve the association. Customer
identities and addresses are omitted from this record.

## Exchange

- 2026-11-23 Kareem supplied the outstanding identity clarification and selected:
  "Keep It Related To Drew; Mark For Review".
- 2026-11-23 Agent verified the current selected Person and retained that relation.

## Decision

Keep the disputed Lead related to its currently selected Person and mark the
identity discrepancy for review. Do not reassign it to the influencer POC based
only on a shared email address.

## Why

Kareem explicitly chose preservation with review. This is not confirmation that
the two identities refer to the same individual.

## Consequences

The live Lead was marked Needs Review. A To Do review task was created and linked
to both People, with the owner instruction and Lead reference in its body.
The task preserves the review request because ordinary sync can recompute the
Lead's Person Match status. No application code or deployment was required.

## Evidence

Supported REST API readback on 2026-11-23 verified the unchanged selected Person,
Needs Review status, To Do task and both task relations. Before-state and result
evidence remain in the private dashboard session directory on the owner's Mac.
The identity discrepancy remains open for review; dashboard coverage totals were
not recalculated by this scoped update.
