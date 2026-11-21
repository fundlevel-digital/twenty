# 0006. Put Slack controls in native App preferences

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "Please utilize the "app preferences" (like the linkedin app) vs. settings/config"
- 2026-11-21 Agent: Placed the per-user Sync controls in native App preferences and changed the health action to open that surface.

## Decision

Use the native Apps preferences surface, following LinkedIn, for member connection and sync controls.

## Why

The owner explicitly rejected a separate settings/config workflow.

## Consequences

General owns native connections. Sync owns contact preferences and history import. The canonical route is /settings/app-preferences/<applicationId>. Member preferences and imported-test-data summaries are scoped to the signed-in member. Slack application credentials remain server-side application variables.

## Evidence

logic-functions/settings.ts; front-components/settings.tsx; health-check.ts; USER-scoped Sync navigation definition. Browser navigation and member-scoped route tests passed.
