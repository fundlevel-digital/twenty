# 0007. Keep Developer OAuth Setup Out Of Sync Settings

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [OAuth](0005-oauth-and-clear-per-object-backfills.md), [Shared Controls](0006-use-shared-twenty-controls-for-setup.md)

## Exchange

- 2026-11-22 Kareem, showing the OAuth registration paragraph, client-variable
  names and callback URL in normal Sync settings: "wtf is this lol"
- 2026-11-22 Agent: identified developer configuration leaking into the normal
  product flow and proposed connection actions with clear status instead.

## Decision And Interpretation

Kareem rejected the displayed setup experience. The agent's interpretation of
that screenshot, consistent with the existing preference for OAuth and native UI,
is to remove developer registration instructions from normal Sync settings.
Users should see connection status and native connection-management actions.

The exact presentation and status-query implementation are agent implementation
choices, not additional owner requirements. OAuth client registration remains a
real administrator prerequisite; removing its paragraph does not configure it.

## Implementation

Normal Sync settings now query only connection metadata: provider readiness,
provider names and authentication-failure flags. They show connected-account
count, reconnect guidance, or an honest OAuth-setup-pending status, and link to
Twenty's native app connection management. No access tokens are requested by
these frontend status queries. The native provider performs actual authorization.
Personal-token instructions remain available on demand. Client-variable names,
registration steps and callback instructions live in developer documentation and
native developer configuration. `DESIGN.md` records this product-flow rule.

Source and isolated preview only. Real OAuth authorization still requires a
configured GitHub app registration and has not been claimed as complete.

## Verification

Typecheck and lint passed. A fresh browser verified the setup-pending status,
absence of client-variable/callback instructions, collapsed token help, and the
working native connection-manager link. Light and dark screenshots were checked
with no page exceptions. OAuth credentials remain unconfigured.
