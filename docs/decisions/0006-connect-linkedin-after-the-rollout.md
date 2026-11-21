# 0006. Connect LinkedIn After The Rollout

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: release operations / LinkedIn
- Related: [Combined rollout](0005-roll-out-six-sessions-to-live-crm.md)

## Context

The core CRM and LinkedIn migration-stage app were already deployed. The agent
asked the owner to connect LinkedIn Sync so legacy messages could migrate into
a member-owned native message channel. That request implied urgency even though
connection setup is not required to install the app or complete the core rollout.

## Exchange

- 2026-11-21 Agent: requested a native LinkedIn Sync connection and explained that the 821 legacy messages would remain intact meanwhile.
- 2026-11-21 Kareem: "Why do u need it; I was gonna do it later"
- 2026-11-21 Agent: clarified that the connection supplies a member-owned migration destination, is not needed for deployment, and can be completed later.

## Decision

Leave native LinkedIn connection setup and its dependent history migration for
later. They do not block the installed app or completed core rollout. Preserve
all 821 legacy messages, avoid assigning the unowned account by inference, and
do not prune legacy objects or remove the separate official app in the meantime.
Slack OAuth/live events also remain pending under decision 0005.

## Why

Kareem intends to connect LinkedIn later. Existing ownership and privacy checks
require an actual migration destination before retiring the legacy data.

## Consequences

No immediate owner action is required for this deployment. Resume the staged
LinkedIn cutover when the owner is ready to connect and migrate.

## Evidence

[Rollout handoff](../handoffs/2026-11-21-live-crm-rollout.md): the image and app
installations are live, PlusVibe associations were migrated, and legacy LinkedIn
counts remain unchanged.
