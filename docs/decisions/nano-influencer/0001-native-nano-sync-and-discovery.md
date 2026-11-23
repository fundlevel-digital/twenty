# 0001. Native Nano Sync And Discovery

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [Application](../../../packages/twenty-apps/internal/nano-influencer/README.md)

## Context

The Creator Eagle repository contains a NanoInfluencer integration. Kareem asked
for a Twenty application and clarified its initial scope.

## Exchange

- 2026-11-22 Kareem: "Ok, I'd like to build a Twenty CRM app"
- 2026-11-22 Kareem: "for it"
- 2026-11-22 Agent: proposed People enrichment as a starting assumption and asked which workflows mattered.
- 2026-11-22 Kareem: "Kinda both ? MVP would be to sync Nano lists, creators, hides/favs, etc. would also be really nice to be able to find creators yeah - like in worflows and also commands (i.e. find lookalike from this influencer)"
- 2026-11-22 Agent: asked whether membership and favourite/hide changes should push back to Nano.
- 2026-11-22 Kareem: "Two-Way: Pull From Nano And Push Explicit Twenty Actions"
- 2026-11-22 Kareem: "please lmk when u have a preview on ur vm, an give me a link"

## Decision

Build a Twenty app that imports Nano lists, creators and favourites/hides,
allows explicit outbound membership/state changes, and supports lookalike
searches from commands and workflows. Provide an isolated VM preview.

## Why

Kareem specified list synchronization and discovery as the MVP, extending the
agent's initial People enrichment assumption.

## Consequences

Implementation uses dedicated Nano Creator, List, Membership, Search and Search
Result objects. These names and the resumable jobs design are implementation
choices, not separately approved owner preferences. Creator identity is scoped
to platform and Nano ID; saved/hidden state belongs to list membership.

## Evidence

The application README describes behavior, source boundaries, checks and preview
limitations. Source integration was inspected in the local Creator Eagle
checkout at `5993942`, notably `packages/nano-influencer/src/`. The app is not a
production deployment. The preview request does not authorize copying customer
CRM data or running paid discovery batches.
