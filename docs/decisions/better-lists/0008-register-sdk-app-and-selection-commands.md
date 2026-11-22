# 0008. Register The SDK App And Add Selection Commands

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [Workspace folder and preferences](0007-use-app-preferences-and-workspace-folder.md), [Retained prototype](0006-restore-earlier-data-model-layout.md)

## Context

The previous preference entry was a host shortcut. It did not register an installed application or supply SDK commands. Kareem pointed out the missing Installed Apps entry and commands, then supplied Attio's selected-record workflow.

## Exchange

- Kareem: "better list not showing up" (screenshots of App Preferences and Installed Apps).
- Kareem: "also there's no better list commands"
- Kareem: "Atio has this flow" (select records, Add to List, choose an existing list or create a new one, then a confirmation with Go to List).
- Agent: asked whether Create New should open a blank-list form or a starter-template chooser.
- Kareem: "Blank List Form"
- Agent: register and install a real SDK app in the isolated preview, add registered commands, and implement the selected-record workflow with a blank form.

## Decision

Better Lists must have an actual Installed Apps entry and SDK commands. Add Create Better List and Manage Better Lists globally, plus a pinned Add to List action for explicit record selections. The selected-record flow offers compatible existing lists and Create New List. Creation keeps the selection's parent object fixed, adds the selected records, and provides Go to List confirmation. Use a blank form rather than a template gallery.

## Consequences

The SDK app lives at `packages/twenty-apps/internal/better-lists`. It owns its registration, role, front components, settings-menu entry and three commands. Its USER-scoped Lists menu item appears under App Preferences; the native General tab remains standard. SDK components use Twenty's normal command side panel and native UI primitives. This UI placement is an implementation choice, not an owner request for a specific modal design.

Requests use `RestApiClient` with `runAs: 'user'`. App role grants cover record reads, creation and updates plus DATA_MODEL and LAYOUTS configuration; the permission engine intersects these with the member's own permissions. The update grant is a host compatibility requirement: creation is checked as an update when the separate create-permission feature flag is disabled. The UI reads parent records and creates entries. Parent records are referenced, not duplicated. Failed records can be retried separately from confirmed successes. Select All across a filtered dataset is excluded from availability.

The retained fork still supplies membership synchronization, parent protection and generic deletion cleanup. Existing list objects and attributes stay workspace Custom metadata; installation does not transfer ownership or rename that application. The prior preference card is suppressed for ordinary App Preferences users in favor of the real SDK row; metadata-only users retain the prior management fallback.

This is an isolated preview installation, not a production deployment. Verification and preview recovery details are recorded in the handoff.

## Evidence

- Owner screenshots: `.context/attachments/assets/34a83eb8-ce1d-42cb-b212-bfb794ac5932/`, `3fd78023-32c6-4338-8ab7-5bae55013c4e/`, `a60d6d03-c7b7-4f33-b04c-f3d4f34b05e2/`, and the six Attio workflow screenshots attached in this exchange.
- [App README](../../../packages/twenty-apps/internal/better-lists/README.md).
- [Implementation and verification handoff](../../handoffs/2026-11-22-better-lists.md).
- Hindsight remains unavailable in this VM; no external memory retention is claimed.
