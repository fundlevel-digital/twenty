# 0005. Distinguish Host Requirements From Code Location

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [App-only boundary](0003-app-only-boundary.md)

## Context

Asked which Better Lists features were fork-specific, the agent listed everything currently implemented in the host. That described code location rather than identifying which capabilities actually require extending the host.

## Exchange

- Agent: "All Better Lists-specific behavior currently lives in fork code."
- Kareem: "No, by fork specific, I meant like things that couldn't be contained within an app, right? Like stuff that would actually change like the underlying engine shit."

## Decision

When assessing fork-specific work, distinguish capabilities requiring host changes from portable behavior merely implemented in host files. Do not describe list management, metadata provisioning or membership synchronization as inherently requiring engine changes because this prototype placed them there.

## Consequences

No implementation changed in this exchange. The concrete core-engine edits in this prototype are Better Lists validation in field/object metadata services and membership cleanup inside the object-deletion migration handler. Reproducing those exact checks and cleanup inside generic host mutation paths would require host changes. App-controlled settings/deletion and app event functions are different implementation options; their parity has not been verified.

Dedicated sidebar/settings placement and modifications to generic field editors are host UI integrations, not a new list engine. SDK app settings and standard navigation can replace their placement. The prototype does not introduce a new entity type, field type, relation type or membership filter operator: it uses ordinary custom objects, relations and a multi-select field.

This clarification does not authorize further fork changes, removal of code or deployment.

## Evidence

- Owner reply: `.context/attachments/8Sme1i/chat-reply-2026-11-22_11-31-40.txt`.
- Core services: `packages/twenty-server/src/engine/metadata-modules/field-metadata/services/field-metadata.service.ts` and `object-metadata/object-metadata.service.ts`.
- Core deletion handler: `packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-runner/action-handlers/object/services/delete-object-action-handler.service.ts`.
- Existing schema provisioning: `packages/twenty-front/src/modules/better-lists/hooks/useCreateBetterList.ts`.
- Existing membership implementation: `packages/twenty-server/src/modules/better-lists/better-lists.listener.ts` uses internal ORM transactions and advisory locks. Moving its behavior to app functions does not imply identical transaction guarantees without redesign and verification.
