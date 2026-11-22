# 0009. Use Twenty Select And Explain Profile Refresh

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Shared Controls](0006-use-shared-twenty-controls-for-setup.md), [Backfill Controls](0005-oauth-and-clear-per-object-backfills.md)

## Exchange

- 2026-11-22 Kareem, showing the browser-native source-field menu:
  "I don't like how this dowpdown looks, use the actual dropdown components from 20 man."
- 2026-11-22 Kareem: "Add what \"referesh profiles\" mean"
- 2026-11-22 Agent: replace the browser-native select with the shared Twenty
  Select/Field components, keep popups in the app's scoped theme, and explain
  refresh behavior beside the sync controls.

## Decision

Use Twenty's actual dropdown components for app settings. The earlier native
HTML select workaround is rejected. Resolve integration problems with the shared
component rather than substituting the operating system's menu. Explain that
refreshing re-fetches GitHub-derived data into the same profile record while
preserving CRM relationships.

## Implementation

All source-field, sync-behavior, backfill-behavior and scan-size controls use
Twenty Select inside Field. The app uses the shared scoped ThemeProvider, and each
Select portal mounts in its own positioned field container so the sandbox and
host use the same local coordinate frame; Positioner uses the existing product
pattern with item-alignment disabled and a normal dropdown offset. Shared
component styles are unchanged.

The helper copy identifies updated account details, email, social links, counts
and avatar, replacement of GitHub-provided values, and preservation of People,
Company and Influencer links. Scope remains source and isolated preview.

The browser check also exposed an integration defect: generated Base UI label
IDs collided with existing host controls, giving a picker the Inbox accessible
name. The app now supplies namespaced root, label, trigger and listbox IDs to
the shared components. This keeps the native component APIs and styles intact.

## Relation-Retention Clarification

- 2026-11-22 Kareem: "What happens if a company or person has a GitHub profile and then whatever, like somehow they get a profile related to it and then I change the profile link and then like I don't want it to automatically remove the relationships. Does it like append the new one or something or how does that work?"
- 2026-11-22 Agent: confirmed the current implementation adds the new relation
  while preserving old ones when Remove Automatic Relations is off. In Link
  Existing Profiles Only mode, the new profile must already exist; Create Missing
  Profiles can fetch/create it. Repeated syncs deduplicate pairs.

The owner's preference is to retain existing relationships when source URLs
change. The already-established cleanup default remains off, independently for
People and Companies. No settings or records were changed for this explanation.

## Verification

Typecheck and lint passed. A fresh preview browser verified all six selectors,
readable options, selection changes, keyboard dismissal and refresh helper text.
Both light and dark popups matched the 32px trigger's width and opened 4px below
it, with no page exceptions. Server readback also confirmed removal is off for
both record types and both are currently in Link Existing Profiles Only mode.
No saved preferences, customer records or GitHub data were changed by these UI
checks.
