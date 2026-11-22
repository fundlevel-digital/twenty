# 0006. Configure Refresh Timing And Profile Enrollment

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Twitter Analytics
- Related: [preview scope](0004-preview-scope-and-backfill-explanations.md), [native UI](../0007-reuse-native-twenty-ui-components.md)

## Context

The app had a fixed daily 05:00 UTC cron, a selected-record refresh command and
an existing `calculationsEnabled` boolean. Kareem requested control over timing,
a native refresh workflow and explicit enrollment on each profile.

## Exchange

- 2026-11-22 Kareem, attached reply quoting the fixed frequency: "Make this configruable please"
- 2026-11-22 Kareem: "I'd prefer there to be a command and workflow to refresh them tho too;"
- 2026-11-22 Kareem: "Also, I'd like there to be a attribute on the profiles that enrolls/disenrolls them in the scheduled calculations"
- 2026-11-22 Agent: reuse the existing enrollment field, expose native schedule controls and add a native manual workflow while keeping these follow-ups on preview.

## Decision

Allow configurable scheduled refreshes, provide a command and workflow for
explicit refreshes, and make per-profile scheduled enrollment clear. Continue
the preview-only scope; this request does not authorize a live rollout.

## Why

Kareem explicitly wants control over automatic timing, manual execution and
which profiles participate. Reusing the existing field preserves saved values.
The frequency choices, UTC controls and shared refresh implementation are agent
implementation choices, not additional quoted owner requirements.

## Consequences

Native App Preferences offer Off, Hourly, Daily and Weekly with UTC time controls.
The existing boolean keeps its identifier and defaults and is labeled
**Scheduled Calculations**, with a visible default-view column. Manual commands
and workflows bypass enrollment; scheduled jobs filter for enrolled profiles.
The app installs a single-record refresh workflow and reusable action, and
records each attempted scheduled window before provider work. Preview cron
registration remains disabled to avoid unattended spend.

## Evidence

See the [app guide](../../../packages/twenty-apps/internal/twitter-analytics/README.md)
and [session handoff](../../handoffs/2026-11-22-twitter-analytics.md).
Native preview checks verify disabled/initialized/repeated schedule ticks,
enrollment filtering and exact manual/workflow selection without provider calls.
Browser checks save and reload a weekly UTC schedule with native controls, then
restore the original preferences. Source and preview verification do not imply
merge or production deployment.
