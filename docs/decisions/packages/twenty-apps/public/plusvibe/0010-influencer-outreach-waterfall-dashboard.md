# 0010. Track Influencer Outreach And POC Waterfalls

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Area Index](DECISIONS.md), [Lead Relations](0003-keep-source-leads-related-to-people.md)

## Context

Kareem requested a dashboard in the live Fundlevel workspace showing influencer
outreach coverage through their points of contact and email addresses.

## Exchange

- 2026-11-22 Kareem: "Help me make a dashboar don the live fundlevle workspace"
- 2026-11-22 Kareem: "U can make a new page if needed"
- 2026-11-22 Kareem: "Every influencer has a POC; each POC should be linked to a Plusvibe lead"
- 2026-11-22 Kareem: "What I wanna see is which POC/Emails haven't been a plusvibe lead / haven't gotten plusvibe emails to"
- 2026-11-22 Kareem: "We'll try the first one. We'll put them through a full sequence They don't respond. We'll go to the next one and then we'll go to the next one next one And then once the whole water falls down, it'll start back up from the top."
- 2026-11-22 Agent: investigating existing lead relations, imported history,
  influencer scope and ranking before constructing the live dashboard.

## Decision

Provide visibility across all influencers in the requested existing dashboard's
scope. Show which POCs/email addresses have a corresponding PlusVibe lead,
which have recorded outreach, and how often addresses have been used.
Represent the described ranked, sequential contact waterfall and repeated rounds.
A separate dashboard page is permitted when needed.

## Why

Kareem needs to identify influencers that have and have not received outreach
and follow the order of POC email attempts across full sequences and rounds.

## Consequences

This request authorizes dashboard work in the live workspace. It does not request
sending emails or enrolling contacts into campaigns. The ranking location and
current completeness of source lead/history imports require verification.
The agent proposed distinguishing missing leads, no recorded sends, active
sequences, replies, suppressed addresses and completed rounds; these are
implementation proposals, not separately approved owner choices.

## Evidence

The source Lead object includes Person, Workspace and Campaign relations,
email, typed status and raw status. See the maintained
[app README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).
The [prior rollout](../../../../../handoffs/2026-11-21-live-crm-rollout.md)
reported a pending full source Lead/history refresh; this is historical evidence,
not a fresh live verification. Live discovery could not proceed: Conductor's
read-only Mac command returned `Timed out waiting for client`, and this cloud VM
has no saved CRM connection. No live dashboard change was made.
