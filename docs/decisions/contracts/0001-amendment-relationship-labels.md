# 0001. Amendment Relationship Labels

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Contracts

## Context

The owner linked the live Contracts amendment field settings at
`https://crm.fundlevel.co/settings/objects/contracts/amendment`.
The existing self-relation linked one agreement to many amendments. Its labels
were Amendment and Amendment Amended, with generic descriptions.

## Exchange

- 2026-11-23 Kareem: "Can u rename this to Amendment and `Amendments` and  `Amended Agreement`"
- 2026-11-23 Kareem: "Also add a proper description pelase"
- 2026-11-23 Agent: Interpreted Amendment as the singular term, Amendments as the collection label, and Amended Agreement as the link back to the agreement. Updated both field labels and descriptions on the live CRM.

## Decision

Use Amendments for the one-to-many field and Amended Agreement for the
many-to-one field. Keep Amendment as the singular term in the explanation;
this relation has no separate singular/plural label settings. The descriptions
were authored by the agent in response to the owner's request:

- Amendments: "Amendment records that modify this agreement, including changes to its terms, scope, fees, or duration. Each amendment links back to this agreement through Amended Agreement."
- Amended Agreement: "The agreement this amendment modifies. An agreement can have multiple amendments; each amendment links to one amended agreement."

## Why

The owner requested these names and a proper description. The descriptions
explain the direction and purpose of each link.

## Consequences

Applied directly to the live workspace through the authenticated metadata API.
The API names remain `amendment` and `amendmentAmended`. Label/name synchronization
was disabled for the collection field so its plural display label can differ
from its existing API name. No application deployment or record edits were needed.

## Evidence

Fresh metadata readback verified both labels, descriptions, unchanged API names,
settings, relation types and reciprocal field IDs. Private before/after metadata
evidence remains on the owner's Mac under
`~/.twenty/amendment-settings-2026-11-23/`; credentials were not copied to this
workspace or documentation. Browser rendering was not separately verified.
Hindsight was unavailable in this VM because its private profile was missing.
