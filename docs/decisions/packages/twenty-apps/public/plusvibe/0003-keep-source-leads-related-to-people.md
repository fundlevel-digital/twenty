# 0003. Keep PlusVibe Leads Separate and Related to People

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

The connector originally centered on People and native message history without
a dedicated source Lead directory. Investigation of an approved snapshot also
showed a primary-email-only lookup missing an existing Person's additional email
and associating history with an imported duplicate.

## Exchange

- 2026-11-21 Kareem, excerpt: "Shouldn't we have a "PlusVibe Leads" object?"
- 2026-11-21 Kareem: "it should also have a many-to-one relation to people"
- 2026-11-21 Agent: added source Leads and matching through primary and additional addresses, preserving existing Person data.

## Decision

Represent provider Leads as PlusVibe Leads with many-to-one Person relations,
plus Workspace and Campaign relations. Match existing People before creation,
using normalized primary and additional email addresses. Keep source Leads when
unmatched; do not invent provider IDs or create another Person for an ambiguous
match.

## Why

Source Leads have their own provider identity and campaign/workspace context;
multiple Leads may belong to one CRM Person. Exact address matching prevents
secondary-address conversations from creating avoidable duplicates.

## Consequences

People expose the inverse PlusVibe Leads relation. Matching verifies complete
addresses after LIKE filtering, paginates candidates, preserves manual Lead
Person selections and source mappings, and keeps ambiguous matches as Needs
Review. Partial email events do not overwrite a fully imported Lead profile.

The preview's copied history was related to the existing intended Person. No
production duplicate cleanup or history reassignment was performed after the
preview-only instruction. Employee exclusions and creation policy refine new
creation in record 0009; existing matches remain valid.

## Evidence

- Local commit `8be3d1e815`; later policy work in `04552bccae`.
- Tests cover additional addresses, case normalization, substring rejection,
  ambiguity, pagination, manual selection and source identity.
- Native preview checks verified Lead-to-Person relations and copied history.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
