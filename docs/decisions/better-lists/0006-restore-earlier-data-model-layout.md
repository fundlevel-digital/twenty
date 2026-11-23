# 0006. Restore The Earlier Data Model Layout

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [List separation](0002-distinct-navigation-and-fixed-parent.md), [App-only boundary](0003-app-only-boundary.md), [Fixed parent](0004-keep-parent-fixed-until-revisited.md)

## Context

After distinguishing app-portable behavior from the actual engine changes, Kareem accepted keeping the current approach and requested the earlier Data Model layout.

## Exchange

- Kareem: "Ok yk what it's fine."
- Kareem: "Can u just go back to the data model layet from before tho"
- Agent: asked whether this meant the original object settings or earlier dedicated list settings. With no clarification received before implementation, interpreted the request narrowly as restoring the original Fields, Settings and Layout screen and its Manage Attributes entry point.

## Decision

Retain the existing Better Lists prototype for this task and restore the earlier Data Model presentation. This is a scoped exception to decision 0003's requirement to replace this prototype with an app-only version; the general preference for app-only work and advance disclosure of fork requirements remains in force.

Keep the fixed-parent requirement from decision 0004. The layout restoration does not authorize parent changes, additional list relations or production deployment.

## Consequences

The normal Data Model object-detail route now renders its original Fields, Settings and Layout tabs for list entry objects. Dedicated list settings link to it through Manage Attributes instead of embedding the field table. The standard Relations and Fields layout is restored; Add Relation stays hidden for managed lists because their parent remains fixed. Other objects retain their relation controls.

The Lists sidebar, dedicated identity settings, membership synchronization and existing metadata guards remain. Parent-field edit links remain protected. No schema, records or views were deleted or migrated, and no backend change was needed for this layout restoration.

## Evidence

- `packages/twenty-front/src/pages/settings/data-model/SettingsObjectDetailPage.tsx` is restored to the pre-feature implementation.
- `packages/twenty-front/src/modules/better-lists/components/BetterListSettingsPage.tsx` links Manage Attributes to the native object-detail route.
- `packages/twenty-front/src/modules/settings/data-model/object-details/components/tabs/ObjectFields.tsx` hides Add Relation only for managed lists.
- Verification and limitations are recorded in the [handoff](../../handoffs/2026-11-22-better-lists.md).

## Follow-Up Confirmation — 2026-11-22

Kareem answered the pending layout clarification with "Original Object Settings Tabs". This confirms the interpretation used for the restoration above; no further implementation change was needed. In this checkout the native tabs are Fields, Settings and Layout, with Relations inside Fields and index management inside Settings.
