# 0004. Use Multiple Member-Owned API-Key Connections

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

One credential could not represent independently selected source workspaces for
several PlusVibe accounts. The owner pointed to an existing multi-key connection
implementation and asked for the same capability here.

## Exchange

- 2026-11-21 Kareem, excerpt: "Also, this session implemented multi-api-key connections; can u please do the same for the plusvibe app"
- 2026-11-21 Agent: added native encrypted API-key connections, per-connection workspace selection and credential routing.
- 2026-11-21 Kareem later requested Apps preferences like LinkedIn; record 0007 covers that placement.

## Decision

Support one native connection per API key. Each member controls their own
connections, selected workspaces and preferences. Route provider requests,
webhook checks and native email channels through the connection assigned to the
source workspace. Never silently substitute another key.

## Why

Keys may expose different PlusVibe accounts and workspaces. Independent
ownership and routing prevent one member's changes from affecting another's
inbox or sync selection.

## Consequences

New connections use a USER-scoped provider; the old WORKSPACE provider remains
because Twenty cannot mutate an existing provider's scope. Legacy jobs retain
saved-variable compatibility without presenting a global key as a personal
connection. Owners can add, manage, reconnect and stop each account separately.
A source workspace can be selected through only one connection at a time.

No workspace is enabled by entering a key alone. Explicit Enable Sync registers
provider webhooks and starts the historical import. The VM connection remained
at zero selected workspaces during the agent's final verification.

## Evidence

- Local commits `8be3d1e815` and `75081446c1`.
- Tests cover multiple accounts, ownership denial, identical keys used by two
  members, revoked/missing assigned keys and independent selections.
- Real browser verified native USER key entry and preference persistence.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
