# 0008. Use A New GitHub OAuth App Registration

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [OAuth Preference](0005-oauth-and-clear-per-object-backfills.md), [Connection UI](0007-keep-developer-setup-out-of-sync.md)

## Exchange

- 2026-11-22 Agent: asked whether an existing Fundlevel GitHub OAuth app should
  be used, noting that registration is required and secrets should not be pasted.
- 2026-11-22 Kareem: "No—use a new OAuth app"
- 2026-11-22 Kareem: "Does the 5k/hour limit apply to the entierh OAuth client or per oauth connection?"
- 2026-11-22 Agent: verified GitHub's documentation. User OAuth tokens normally
  share the authenticated GitHub user's 5,000/hour REST allowance across tokens,
  OAuth apps and personal tokens. Distinct GitHub accounts have separate primary
  allowances; multiple connections to one account do not multiply it.

## Decision

Use a new GitHub OAuth app registration. Do not reuse an existing client or treat
additional tokens for the same GitHub account as additional primary quota.

## Scope And State

The existing implementation groups credential cooldowns by GitHub user ID and
already handles that quota-sharing rule. Registering the new client is authorized;
creation/configuration and successful real authorization remain separate outcomes
that must be verified. The native CRM OAuth provider is installed in the preview;
no real OAuth client credentials have been configured yet.

## Source

[GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api#primary-rate-limit-for-oauth-apps).

## Registration Handoff

The authenticated GitHub CLI identifies the owner as an administrator of the
Fundlevel organization, but it cannot replace GitHub's interactive OAuth-app
registration. The Mac's available browser was opened to the organization's new
OAuth-app page. That session could not access organization settings; the GitHub
sign-in page was opened with registration as its return destination. Safari also
rejects scripted form inspection because JavaScript from Apple Events is disabled.
No browser security setting was changed, no new app was created, and no client
secret was generated or transferred. Interactive GitHub sign-in is outstanding.

## Owner Takes Over Registration

- 2026-11-22 Kareem, responding to the GitHub sign-in request: "Oh it's okay, I can do it myself"

Kareem will handle the new OAuth app registration. Stop browser automation for
that step. The app's existing developer configuration accepts the resulting
client ID and secret; secrets should be entered there, not shared in chat.
No registration, client-credential configuration or successful OAuth login is
claimed by the agent.

## Owner Configuration And Verification

- 2026-11-22 Kareem: "K I added and logged in"

The owner completed registration and entered credentials directly. Native preview
metadata now reports OAuth client configuration as ready. Read-only connection
inspection found one OAuth connection without an authentication failure and no
personal-token connections. The existing public demo profile refreshed successfully
through the app's OAuth-first credential pool; profiles remained at 36. No secrets
were retrieved or recorded. This confirms a real OAuth-backed API request, not
just an installed provider. Expired-token refresh remains unexercised.
