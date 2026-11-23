# 0011. Defer POC Ranking

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Dashboard Request](0010-influencer-outreach-waterfall-dashboard.md)

## Context

The agent asked where the POC email ranking was stored before building the
outreach dashboard. Kareem clarified that there is no ranking and it is not
needed for the current work.

## Exchange

- 2026-11-22 Agent: "Where is the POC email ranking currently stored? I’ll use it for the waterfall order if it already exists."
- 2026-11-22 Kareem: "Nah it doesn't; and u shouldn't need to do this rn"
- 2026-11-22 Agent: proceed with influencer/POC lead coverage, recorded sends
  and email usage, leaving ordering for later.

## Decision

Ranking does not exist yet. Do not make the current outreach coverage dashboard
depend on a ranking or implement waterfall ordering now. This refines record
0010's immediate scope; the described waterfall remains future context.

## Why

Kareem explicitly said the ranking was not needed now.

## Consequences

The current view focuses on influencers, POCs, imported lead relations and
recorded PlusVibe email activity. Do not infer a sequence order or completed
waterfall rounds from send counts.

## Evidence

Owner clarification in this conversation. Deployment and verification evidence
belong in the implementation handoff, separately from this scope decision.
