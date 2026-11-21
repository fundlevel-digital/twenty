# 0001. OAuth Connections And An Isolated Preview

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Cal.com

## Context

Kareem asked how to build a Cal.com app in the Twenty repository. The agent
proposed a native Twenty SDK app with booking sync, contact matching, booking
answers, scheduling links, and historical import. The initial recommendation
used an API key for one account before adding OAuth.

## Exchange

- 2026-11-21 Kareem: "How can we build a cal.com app"
- 2026-11-21 Agent: proposed the native app and an API-key-first implementation.
- 2026-11-21 Kareem:

  > please start.
  >
  > Build it w/ cal.com oauth connections, and lmk when u have a preview up

## Decision

Build the integration with native Cal.com OAuth connections from the start and
provide an isolated preview. API-key authentication is not the requested first
implementation.

## Why

OAuth connections are Kareem's explicit requirement. The request to see a preview
supports an isolated development deployment; it does not authorize production
changes.

## Consequences

The app source belongs in `packages/twenty-apps/public/cal-com/`. Connection
credentials use Twenty's existing OAuth connection provider system. Real Cal.com
authorization requires a registered and accepted OAuth client. Preview data must
be demo data, with no production records or credentials copied.

## Evidence

- Owner exchange above.
- [Cal.com OAuth documentation](https://cal.com/docs/api-reference/v2/oauth).
- [Native connection example](../../../packages/twenty-apps/public/fathom/src/connection-providers/fathom-user-connection.ts).
- Implementation and preview verification are recorded separately in the app
  README and session handoff; this decision alone makes no deployed-state claim.
