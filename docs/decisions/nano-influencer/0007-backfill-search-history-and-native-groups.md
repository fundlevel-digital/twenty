# 0007. Backfill Search History And Use Native Groups

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [0005](0005-preserve-profile-json-and-native-avatars.md), [0006](0006-configure-people-sync-deletion-and-attribution.md)

## Context

The owner found a contact-method label in Emails, blank list ownership, empty
relation groups and empty search-history sections after importing Nano lists.

## Exchange

- 2026-11-22 Kareem: "List owner is empty tho? Is that right?"
- 2026-11-22 Kareem: "wth is twitter DM lol?"
- 2026-11-22 Kareem: "Would be nice to be able to group by email, country"
- 2026-11-22 Kareem: "seems empty, looksright when I group by saved state, but empty when grouping by creator and list"
- 2026-11-22 Kareem: "are these not backfilled?"
- 2026-11-22 Agent: verified that only Twenty-created searches had been stored;
  Nano exposes a paginated saved-task history. A working owner-added connection
  exposed 529 entries. Saved keyword results remain readable; an older similar
  search returned `removed`.
- 2026-11-22 Agent: interpreted email grouping as the decision-maker email shown
  in the attached membership screenshot. A clarification also offered creator
  email availability; no answer had arrived when implementation began.

## Decision

Backfill existing Nano searches and available saved results without submitting
new searches. Retain raw provider logs and result responses. Keep contact-method
labels, masked addresses and invalid strings out of the email display array,
while preserving their source snapshots. Model Country as a native Select and
backfill previously stored names/codes.

Provide populated native membership groups for List, Creator and Decision Maker.
Do not infer a list owner from the person who favourited or hid a creator.

## Implementation Choices

The app adds a related Nano User for decision attribution. Usable emails identify
and label these users; a missing email falls back to a connection-scoped Nano
operator identity. These are separate from CRM People and workspace members.
This is the agent's implementation choice, not a separately approved owner data
model. The existing native Email field remains available.

Twenty relation groups require explicit view-group entries. Three named native
views and a refresh command populate those entries from actual memberships.
Their helper is restricted to the app's known membership views and preserves
existing group visibility/order and customized grouping fields.

## Evidence And State

Source implementation is in the app's `lib/history.ts`, `lib/grouped-views.ts`,
Country field definition and native grouped-view manifests. The app test suite,
direct typecheck and lint pass. The isolated VM runs the published Twenty 2.59.0
host with this SDK app; no host frontend source changes or production deployment
are part of this work.

The VM contact/country repair inspected 3,014 current creators and found no
remaining corrections after the backfill. This is a point-in-time check, not a
claim that the ongoing list or search import had finished. Saved-result
availability is explicit in History Import Status. A second saved connection
still rejects history authentication and is reported separately.

See the [handoff](../../handoffs/2026-11-22-nano-influencer-preview.md) for current
VM installation, browser checks, counts and remaining limitations.
