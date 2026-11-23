# 0003. Workflow Actions And Sender-Owned Secrets

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [Managed setup](0002-managed-connection-and-agent-enrollment.md)

## Exchange

- Agent proposed **Send to OpenBot**, which sends a prompt and record context to
  a configured bot, and **Get Request Status**, which reads delivery/answer state.
- Kareem: "This looks good yeah"
- Agent proposed transferring a generated OpenBot routine secret through trusted
  host code during setup.
- Kareem: "I think openbot now let's u use another app's signature for routines tho?"
- Kareem, referring to `POST /v1/admin/events/routines/set-secret`:
  "How are these requests authenticated?"

## Decision

The two workflow actions are approved product direction. OpenBot's supported
sender-owned signing secret must be considered in automatic setup; the previous
claim that setup must retrieve OpenBot's generated secret was incorrect.

## Evidence And State

OpenBot's webhook documentation and `webhook-sender-secret-v1` contract support
setting a sender-owned secret. Its Team API authenticates a host session using
an Authorization bearer token and the setter additionally checks owner/admin
privileges. The listener is loopback-only. This is separate from the routine's
HMAC signing secret and does not grant arbitrary agents administrative access.

- [Webhook documentation](https://github.com/fundlevel-digital/openbot/blob/main/docs/webhooks.md)
- [Sender-secret contract](https://github.com/fundlevel-digital/openbot/blob/main/packages/contracts/src/team-protocol/webhook-sender-secret-v1.ts)
- [Team API authentication](https://github.com/fundlevel-digital/openbot/blob/main/src/main/team-api-server.ts)
- [Routine admin route](https://github.com/fundlevel-digital/openbot/blob/main/src/main/team-api/route-events.ts)

The workflow actions and managed enrollment remain unimplemented. The current
preview tests a local signed webhook/callback integration, not a live OpenBot
host. Retry controls, completion timeouts and failure Inbox notifications are
identified gaps, not approved or implemented policies. No production deployment
was performed.
