# 0002. Prepare Preview And OAuth Registration Details

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Cal.com
- Related: [0001](0001-oauth-app-and-isolated-preview.md)

## Context

The agent asked whether an existing Cal.com OAuth client was available or whether
it should prepare the preview and the details for registering a new client.

## Exchange

- 2026-11-21 Agent: asked where any existing client ID and secret were stored,
  with an alternative to prepare the preview and registration details.
- 2026-11-21 Kareem: "Prepare the preview and registration details"

## Decision

Provide the running isolated preview and exact OAuth registration parameters.
Do not assume that an existing OAuth client or its credentials are available.

## Why

Kareem selected the preparation option in the clarification question.

## Consequences

The preview remains configured with demo data. The client registration requires
an exact redirect URI, the app's five requested scopes and confidential-client
authentication. Credentials belong in the native application registration's
Config tab, not documentation or chat.

## Evidence

- [App setup](../../../packages/twenty-apps/public/cal-com/README.md).
- [OAuth configuration](../../../packages/twenty-apps/public/cal-com/src/constants/oauth-config.ts).
- [Cal.com registration requirements](https://cal.com/docs/api-reference/v2/oauth).
- Local preview health returned `status: ok` during this follow-up.
- No real client registration, OAuth authorization or production action was
  performed in this turn.
