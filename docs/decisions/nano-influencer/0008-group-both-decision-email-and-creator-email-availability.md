# 0008. Group Both Decision Email And Creator Email Availability

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [0007](0007-backfill-search-history-and-native-groups.md)

## Exchange

- 2026-11-22 Agent: "For “group by email,” do you mean the decision-maker email on memberships, whether a creator has an email, or both?"
- 2026-11-22 Kareem: "Both"

## Decision

Support both decision-maker email grouping on memberships and grouping creators
by whether they have a usable saved email address.

## Implementation

Decision Maker uses the related Nano User's email as its label. Creator Email
Availability is a native Select with stable values `AVAILABLE` (Has Email) and
`MISSING` (No Email). Email addresses retain their existing data type; they are
not turned into enum options. A By Email Availability view exposes the two
categories. Current creators are backfilled, and Nano writes plus filtered
create/update events maintain the category as emails change. Blank, masked and
invalid contacts do not count as usable email addresses. Incoming empty Nano
email arrays continue to preserve already known addresses.

The creator-group refresh covers Country and Email Availability together.
Country groups use values actually present in records so unused country options
do not hide populated groups behind Twenty's group visibility/load limits.

## Evidence And Scope

The standalone app's unit suite, direct typecheck and lint cover classification,
existing-email preservation, bulk backfill, stale-event repair and email
removal. The VM handoff records installation, real metadata/browser checks and
remaining background import work. No production deployment is included.
