# 0003. Per-Connection Sync Preferences

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Cal.com
- Related: [0001](0001-oauth-app-and-isolated-preview.md)

## Context

The preview initially synchronized all booking links with no user preferences.

## Exchange

- Kareem: "Is there a way for me to configure which links to watch and stuff like that?"
- Agent: proposed per-connected-account settings for watched booking links,
  future/30-day/90-day/all history, matching or creating contacts, pause/resume,
  manual sync, last sync/errors, and selecting or mapping booking answers.
  Existing CRM records would be preserved, with selection enforced consistently
  for history imports, scheduled jobs and webhooks.
- Kareem: "do it"

## Decision

Implement the proposed configuration page and sync behavior in the app and
update the isolated preview. Preserve existing records when changing settings.

## Why

Kareem approved the proposed controls explicitly.

## Consequences

Settings belong to each connection. Private connections must remain private;
shared connection preferences require workspace app-management permission.
Default behavior remains compatible with the prior import until settings change.
This authorizes preview work, not production deployment.

## Evidence

Implementation, validation and preview outcomes are recorded in the app README
and the [session handoff](../../handoffs/2026-11-21-cal-com-preview.md).
