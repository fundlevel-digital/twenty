# 0002. Managed Connection And Agent Enrollment

- Date: 2026-11-22
- Status: superseded by 0005
- Decided by: Kareem
- Area: OpenBot
- Related: [Initial comments integration](0001-bot-participants-and-vm-preview.md)

## Exchange

- Kareem: "Yeah but how does the setup work? ALso how are we handling bot enrollment/disenrollment and syncing?"
- Kareem: "I'd really like to avoid the need to manually setup routines and shi in openbot, would much rather have the app somehow auto-set it up"
- Kareem: "even if we need to make some sort of OpenBot app"
- Agent: The current preview requires manually configured routine URLs and
  secrets, has no automatic enrollment/profile sync, and should be extended with
  a managed connection. OpenBot's current source is being checked before picking
  the implementation.

## Decision

The intended product must manage its OpenBot connection and bot lifecycle without
requiring people to create per-agent routines or copy per-agent webhook secrets.
An OpenBot-side app or connector is acceptable. The existing manual preview is
an implemented foundation, not completion of this managed setup requirement.

## Source Findings And Proposed Direction

- OpenBot's Team API can list agent profiles and start/read/send to agent tasks.
  It is bound to loopback, so Twenty cannot assume it is a public server API.
- OpenBot's Marketplace applications are MCP servers with optional skills.
  Installing such a listing alone does not establish an always-running CRM
  connection or synchronize agent enrollment.
- Existing Slack/Discord messaging integrations show a native connection and
  automatic reply delivery pattern. A Twenty connector on the OpenBot host can
  reuse agent/task services, keep a connection credential and send automatic
  replies without asking the model to run a callback script.
- Proposed enrollment and lifecycle behavior, still an implementation design:
  an owner connects once, selects which agents are available, and the connector
  syncs stable host/agent identities, profile changes and removals. Revocation
  preserves authored comments and blocks new work immediately. Temporary
  disconnection must not be treated as deletion of all agents.

## State

No managed setup or OpenBot-side connector has been implemented or deployed by
this record. The existing preview still uses a local test bot and the manual
webhook integration. OpenBot source changes and actual pairing remain separate
work from verifying the earlier preview.

## Evidence

- [Integrations and sign-in](https://github.com/fundlevel-digital/openbot/blob/main/docs/architecture/integrations.md)
- [Agent task contract](https://github.com/fundlevel-digital/openbot/blob/main/packages/contracts/src/team-protocol/agent-tasks-v1.ts)
- [Team API listener](https://github.com/fundlevel-digital/openbot/blob/main/src/main/team-api-server.ts)
- [Messaging service](https://github.com/fundlevel-digital/openbot/blob/main/src/backend/messaging/messaging-service.ts)
