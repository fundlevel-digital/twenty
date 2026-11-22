# 0005. Fix The Protected Preview Path

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: twitter-analytics
- Related: [Preview Scope](0004-preview-scope-and-backfill-explanations.md)

## Context

The agent checked the backend and an ungated local TLS browser, then added
clearer errors and Retry. Kareem still reproduced the failure on the public
preview and corrected the assumption that another CRM sign-in would resolve it.

## Exchange

- 2026-11-22 Kareem: "Preview"
- 2026-11-22 Kareem supplied a screenshot showing "Your session expired. Sign in again, then retry."
- 2026-11-22 Kareem: "relogging-indoesn't workeither"
- 2026-11-22 Kareem: "Like it doesn't fix it"
- 2026-11-22 Agent: found that the renderer omits browser cookies for `/s` function routes, while Conductor requires its preview access cookie. Reproduced two 401 responses with a cookie-gated browser, then verified the corrected settings and backfill preview return 200 through that gate.

## Decision

Treat this as a failure on the protected preview path and fix that path. Another
CRM sign-in is not an adequate resolution while Kareem can still reproduce it.
Keep the existing preview-only scope; this does not authorize a live change.

## Why

Kareem explicitly confirmed the environment and reported that signing in again
did not help. A local-origin check bypassed the access layer responsible for the
failure, so that earlier verification did not establish public-preview success.

## Consequences

The agent's implementation uses a preview-only allowlisted alias proxy that
allows Conductor to authenticate browser cookies, then excludes those cookies
and proxy identity headers from app handlers. Production function paths and app
permissions remain unchanged. This routing design is an implementation choice,
not a separate owner instruction. The app also distinguishes Conductor's
plain-text access rejection from an expired CRM session.

## Evidence

- This conversation and supplied screenshots, 2026-11-22.
- [Host Cookie Policy](../../../packages/twenty-front-component-renderer/src/host/fetch/utils/isPageCookieEligiblePath.ts).
- [Preview Proxy And Verification](../../../packages/twenty-apps/internal/twitter-analytics/preview/README.md).
- [Handoff](../../handoffs/2026-11-22-twitter-analytics.md), including the real public-browser check.
