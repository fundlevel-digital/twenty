# 0002. Group PlusVibe Objects and Use Title Case

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

Source objects had appeared as unrelated sidebar entries, and labels did not
consistently follow the naming expected in the CRM.

## Exchange

- 2026-11-21 Kareem: "Can u also make it so that all PlusVibe objects in the sidebar go into the "PlusVibe" folder? Like the linkedin app did"
- 2026-11-21 Kareem: "Please make sure all objects and attributes are in proper title case"
- 2026-11-21 Agent: grouped the app's source and relationship objects and corrected display labels.

## Decision

Put PlusVibe source objects and relationship objects in the PlusVibe sidebar
folder. Use Title Case for display labels, preserving PlusVibe branding and
acronyms such as ID. Keep API identifiers and customer-entered content unchanged.

## Why

The LinkedIn app established the organizational pattern Kareem wanted, and the
owner explicitly requested consistent labels.

## Consequences

Workspaces, Campaigns, Leads, Senders, Threads and Events, plus the required
relationship objects, are grouped together. Twenty's maximum sidebar depth is
two, so relationship objects are immediate children rather than a nested folder.
Three saved-view separators that displayed literal escaped Unicode were also
corrected; that was an implementation defect, not a separate owner preference.

## Evidence

- Local commits `e5376ddab4`, `2bbdb9bec0`, `254e2cf099` and `75081446c1`.
- Native table and sidebar screenshots verified the installed VM state.
- Source: navigation definitions, object labels and views in the app package.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
