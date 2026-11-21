# 0004. Put Analytics Configuration In App Preferences

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Configuration controls](0003-timeframe-columns-and-validated-tags.md)

## Context

The validated controls initially appeared as a workspace Configuration tab.
Kareem wanted the same App Preferences placement as the LinkedIn app.

## Exchange

- 2026-11-21 Agent: built the validated timeframe controls in a Configuration tab.
- 2026-11-21 Kareem: "Please utilize the \"app preferences\" (like the linkedin app) vs. settings/config"
- 2026-11-21 Agent: followed LinkedIn's ordinary front component plus USER-scoped settings-menu-item pattern and moved the controls into App Preferences → YouTube Analytics → Analytics.

## Decision

Expose **Analytics** under native **App Preferences**. Label the action **Save
Preferences**. Keep API-key connection management in the application's native
Add Connection UI.

The menu uses USER scope to place it in App Preferences. Calculation variables
remain workspace-wide because channel records, dynamic columns and the scheduled
refresh are shared. The form explicitly explains this effect; moving the menu
does not make calculations personal to the user.

## Why

The placement is an explicit owner correction. Preserving workspace-wide values
keeps configuration consistent with the shared object and daily job.

## Consequences

Use `defineFrontComponent` and `defineSettingsMenuItem`, retaining stable menu and
component identifiers. Remove the old Configuration tab. The app requires
APPLICATIONS permission for its own application metadata and variable writes,
in addition to DATA_MODEL/VIEWS for metric-column synchronization.

The embedded renderer has no `HTMLInputElement.validity`. Wrapping native
inputs or segmented controls in Base UI `Field.Root` crashed radio changes and
invalid recent-count edits. The final app retains native controls, accessible
labels and shared explicit validation, without `Field.Root` around those inputs.
This fixes the app without changing shared CRM components.

## Evidence

- Owner correction, 2026-11-21.
- [Settings menu](../../../packages/twenty-apps/internal/youtube-analytics/src/settings-menu-items/analytics-settings.ts).
- [Settings component](../../../packages/twenty-apps/internal/youtube-analytics/src/front-components/components/YoutubeAnalyticsSettings.tsx).
- [App role](../../../packages/twenty-apps/internal/youtube-analytics/src/roles/default-function.role.ts).
- Browser checks covered the App Preferences listing and Analytics tab, saved tags and format controls, invalid values, absence of the old Configuration tab, intact connections and zero page errors.
- [Merged PR #4](https://github.com/fundlevel-digital/twenty/pull/4).
