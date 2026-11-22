# 0007. Use App Preferences And A Workspace Folder

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [Original Data Model layout](0006-restore-earlier-data-model-layout.md), [Navigation and fixed parent](0002-distinct-navigation-and-fixed-parent.md)

## Context

After the native Data Model tabs were restored, Kareem requested removing the standalone Lists settings entry, the Manage Permissions shortcut and the dedicated Lists sidebar section.

## Exchange

- Kareem: "Why this here? Can it move to app preferences or something?" (screenshot of the Lists entry in Workspace settings).
- Kareem: "u can remove this too" (screenshot of Manage Permissions).
- Kareem: "this all lists thing shouldn't exists; I'd rather just habve a folder under the workspace view that stores the lists (the two in the preview)"
- Agent: move list management to App Preferences, remove the permissions shortcut and use a normal Workspace navigation folder for list links.

## Decision

Manage Better Lists through App Preferences. Remove the standalone Lists item from Workspace settings and the Manage Permissions shortcut from list settings. Replace the dedicated Lists sidebar section and All Lists item with a native Lists folder under Workspace, containing the two preview lists.

Keep the restored native Data Model tabs and the fixed-parent requirement. Removing the permissions shortcut does not remove permission enforcement.

## Consequences

App Preferences contains a Better Lists preference card. Management and individual list settings use `/settings/app-preferences/better-lists` and its child routes, guarded by DATA_MODEL. Old Better Lists URLs redirect there while preserving query parameters. Account settings retain CONNECTED_ACCOUNTS protection; members with DATA_MODEL can reach Better Lists preferences without gaining account access.

The two existing preview navigation items were moved into a native folder through authenticated metadata APIs, preserving their IDs and list records. The list-creation flow places future list links into that folder and reuses a renamed folder when it already contains a managed list. The custom sidebar renderer and duplicate-link display filter were removed, leaving standard native navigation behavior.

This is a frontend placement change to the retained prototype, not an SDK app installation or ownership migration. No backend behavior, list entries, views or production data were changed. Preview verification may create and remove a temporary list; its result is recorded in the handoff.

## Evidence

- Owner screenshots: `.context/attachments/assets/3672ffeb-0e01-43fb-af0e-5147238986d8/`, `.context/attachments/assets/65ace259-9541-4362-b151-5a695196acdd/` and `.context/attachments/assets/2e350fc1-5066-45cd-84e5-6dbc88d96f34/`.
- Preference placement: `packages/twenty-front/src/modules/better-lists/components/BetterListsPreferencesCard.tsx` and `src/pages/settings/accounts/SettingsAccounts.tsx`.
- Folder placement: `packages/twenty-front/src/modules/better-lists/hooks/useAddBetterListToWorkspaceFolder.ts`.
- Verification and current preview state: [handoff](../../handoffs/2026-11-22-better-lists.md).
