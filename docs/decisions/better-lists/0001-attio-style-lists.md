# 0001. Build Better Lists With Parent Records

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists

## Context

Kareem supplied twelve Attio screenshots showing sidebar lists, list views, data-model settings, permissions, parent selection, emoji, and attributes belonging to list entries.

## Exchange

- 2026-11-22 Kareem: "I want to build a app called \"Better Lists\""
- 2026-11-22 Kareem: "I want it to basically replicate teh Attio lists."
- 2026-11-22 Kareem: "Objects have this \"List Entries\" Attribute that let's u filter and they work in views and stuff, so I can be filter \"Filter for all Influencers where List Entires contains X\""
- 2026-11-22 Kareem: "Lists can have custom, list-only attributes"
- 2026-11-22 Kareem: "Build this and setup a preview on ur VM plz"
- Agent: implement a native host feature using a separate custom entry object for each list, with a required parent relation and a synchronized membership attribute. This implementation choice was not separately approved as an SDK packaging decision.

## Decision

Build the requested list functionality and provide a preview in this workspace. Preserve the distinction between parent records and their list-specific entries. No production deployment was requested.

## Why

The screenshots and explicit requirements establish that lists carry their own views and attributes while referencing existing records.

## Consequences

Implementation is under `packages/twenty-front/src/modules/better-lists` and `packages/twenty-server/src/modules/better-lists`, with native routing and sidebar integration. Each list is represented by a native custom object, identified by its versioned description. Native data-model tools manage its fields and native roles manage permissions. A parent multi-select named List Entries mirrors memberships. List parent type is immutable after creation to preserve entries. Templates, notification subscriptions, and Attio-specific individual/automation permission controls are not implemented.

## Evidence

Source is present in the working branch; it is not merged or deployed to production. Preview setup and behavioral verification are tracked in the session handoff. Three membership lifecycle unit tests passed. The final frontend typecheck passed. Full server typechecks exceeded VM memory; see the handoff for the production-scope check and verification limits. Native browser creation and table rendering were verified. Hindsight was unavailable because this VM lacks its private profile.
