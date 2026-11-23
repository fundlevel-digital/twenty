# 0008. Build The Dashboards Inside Twenty

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Earlier Preview Interpretation](0007-build-cold-and-ghosted-previews.md), [Native Dashboard Handoff](../../handoffs/2026-11-23-native-cold-and-ghosted-dashboards.md)

## Context

The agent built and restored standalone sample-data previews. Kareem corrected
the delivery target: the dashboards belong inside Twenty.

## Exchange

- 2026-11-23 Kareem: "Just make the previews and show me"
- 2026-11-23 Agent: built standalone concepts, then restored those previews when asked.
- 2026-11-23 Kareem: "Bruh; I meant make the dasboard in twenty and let me see it dumbass"
- 2026-11-23 Agent: acknowledged the misunderstanding and configured native Cold and Ghosted tabs on the existing Fundlevel creator dashboard.

## Decision

Deliver the dashboards inside Twenty. The standalone preview was the agent's
incorrect interpretation, not an owner choice. This supersedes record 0007's
delivery interpretation; the accepted stage and outreach requirements remain.

## Why

Kareem explicitly corrected the target. Native dashboard configuration provides
the requested review surface in the existing CRM workspace.

## Consequences

Configured two tabs with 18 native widgets, seven table views and 20 read-only
computed fields on the existing Creator Outreach: Decisions dashboard. Cold
contains coverage and POC/sequence details. Ghosted contains conversations,
both follow-up scopes, inbox history, POC details, reply/message evidence and
two inbox activity charts. Existing tabs and widgets were preserved.

These are live workspace metadata changes using real CRM records. No host
deployment, provider refresh, new sequencing automation, customer stage edits,
campaign enrollment or email sends occurred. Saved CLI authentication was
refreshed on the owner's Mac; credentials remained there.

## Evidence

The [configuration helper](../../../packages/twenty-apps/public/plusvibe/scripts/configure-stage-dashboards.py)
completed and its final run created zero duplicate entities. Metadata readback
confirmed eight Cold widgets and ten Ghosted widgets. Normal 20-row API checks
passed for Cold creators (298 total), Ghosted creators (23), Ghosted POCs (32),
Ghosted reply evidence (42), and Cold POCs (332).

The first-inbox calculation timed out in bulk queries. Its column was removed
from the bulk tables; exact original-inbox evidence remains in the reply/message
table. Follow-up calculations use each POC's existing CRM last-inbound timestamp
and count recorded PlusVibe sends after it; the all-POC count sums those individual
windows. These are implementation semantics, not a newly approved owner reset rule.

Missing imported history and LinkedIn activity remain explicit limitations.
Authenticated API checks passed; the attempted fresh browser reached the login
page, so signed-in browser rendering is not claimed. Hindsight remained unavailable.
