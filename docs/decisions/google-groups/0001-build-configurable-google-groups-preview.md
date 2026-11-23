# 0001. Build The Configurable Google Groups Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Google Groups
- Related: [Runtime verification decision](../0012-verify-google-channel-app-feasibility.md)

## Context

A synthetic app-only probe verified native shared messaging. Kareem then requested an actual app preview whose configuration he would complete later.

## Exchange

- 2026-11-22 Kareem: "Okay setup a preview of the app; use this image: .context/attachments/assets/e31cbf9d-0496-4403-b22a-a58fdc27c6dc/image.png"
- 2026-11-22 Kareem: "Lmk if u need anything from me toconfig it (build and assume I'll fill this out myself later)"
- 2026-11-22 Kareem: "Call the app \"Google Groups\""
- 2026-11-22 Agent: built an independent SDK app, copied the supplied PNG unchanged, installed it in Sunny’s isolated preview and verified disconnected setup and draft persistence in the browser.

## Decision

Name the app Google Groups, use the supplied image and make configuration editable after installation. Proceed with implementation and preview verification without waiting for Google credentials. This does not request production deployment or authorize a real mail import/send before account setup and explicit enabled settings.

## Why

Kareem explicitly chose the name and image and asked to fill in configuration himself later.

## Consequences

The app has native Google Workspace OAuth, Group channels, history and sharing preferences, paused processing, Gmail import and reply logic, and a native app settings page. Defaults are empty and paused. Google Group membership ACLs, a Groups-only archive migration and calendar sync are not implemented.

The source app uses normal authenticated app routes. An ignored preview fixture changes only the settings request path and preview scheduling text to work behind Conductor’s sign-in gate. Production source routing and core code remain unchanged.

## Evidence

[Preview handoff](../../handoffs/2026-11-22-google-groups-preview.md) records implementation, 38 passing tests, typecheck/lint results, runtime permissions checks, browser verification, process details and unverified live-Google behavior.
