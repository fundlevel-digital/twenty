# 0003. Keep App Work Inside The App

- Date: 2026-11-22
- Status: superseded by 0006 for the current Better Lists prototype; general app-only preference retained
- Decided by: Kareem
- Area: Better Lists; repository app development
- Related: [Initial request](0001-attio-style-lists.md), [List configuration](0002-distinct-navigation-and-fixed-parent.md)

## Context

The agent built Better Lists as a native host feature, then disclosed that the dedicated Lists settings section was fork code. That architecture was an agent choice, not an owner-approved exception to app packaging.

## Exchange

- Agent: "the Lists settings section is fork code".
- Kareem: "I'd rather just kleep stuff app only, if somthing is not doable by the app, u should always lmk before just adding extra fork code to maintain"
- Agent: acknowledged the mistake and checked the existing SDK extension points. App settings, app-owned metadata, navigation folders and event-triggered logic functions are supported. The current dedicated Data Model section and Better Lists checks inside core metadata services are host changes.

## Decision

Keep Better Lists and other app requests within app extension points. Explain unsupported features and proposed fork work before adding host changes. Do not treat an app request as permission to expand the maintained fork.

This packaging correction does not reverse the fixed-parent requirement or approve dropping requested features without disclosure.

## Consequences

The existing working tree and VM preview still contain the native prototype. No app-only conversion, ownership migration, runtime rollback or production deployment occurred in this exchange. An app-only replacement remains outstanding. It should use app preferences and supported sidebar navigation; a separate Lists category in the host Data Model is not an SDK settings-menu extension point. Strict global metadata interception needs a separate feasibility assessment rather than a promise of equivalent app enforcement.

The repository authoring rules now preserve this boundary for subsequent app work. Generated agent rules are updated through Ruler.

## Evidence

- Owner's attached reply: `.context/attachments/OcJj3d/chat-reply-2026-11-22_11-14-02.txt`.
- SDK extension types: `packages/twenty-shared/src/application/settingsMenuItemManifestType.ts` and `navigationMenuItemManifestType.ts`.
- SDK settings component: `packages/twenty-sdk/src/sdk/define/front-component/define-settings-front-component.ts`.
- Host changes and prior verification: [Better Lists handoff](../../handoffs/2026-11-22-better-lists.md).
- Hindsight recall remains unavailable in this VM because its private profile/repository metadata is missing. The decision is recorded locally; no external memory write is claimed.
