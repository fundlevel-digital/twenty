# 0009. Hide The Email Availability Column

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [0008](0008-group-both-decision-email-and-creator-email-availability.md)

## Context And Exchange

Kareem supplied a screenshot of the Email Availability column and requested:
"Remove this col please".

The agent identified the column and proposed hiding it from creator tables while
keeping Has Email / No Email grouping available.

## Decision And Implementation

Hide Email Availability in All Nano Creators and By Email Availability. Retain
its native Select field, values and update hooks so the previously requested
grouping continues to work. This changes column visibility without deleting data.

## Evidence And Scope

The two view definitions retain their identifiers and set this column's
`isVisible` to `false`. The isolated preview receives the same definitions;
production deployment is outside this change. Preview verification is recorded
in the maintained [handoff](../../handoffs/2026-11-22-nano-influencer-preview.md).
