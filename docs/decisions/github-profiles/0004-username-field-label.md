# 0004. Username Label And Supplied App Icon

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Native App](0001-native-github-profiles-app-and-preview.md)

## Context

The owner supplied a screenshot of the GitHub Profiles table's Login column.

## Exchange

- 2026-11-22 Kareem, accompanying the Login-column screenshot: "- rename to username"
- 2026-11-22 Agent: rename the visible field label to Username and update its
  refresh guidance, preserving the field's identity and existing data.
- 2026-11-22 Kareem, attaching a replacement GitHub image and the app-card screenshot: "use this instead:"
- 2026-11-22 Agent: use the supplied JPEG unchanged as the application logo.

## Decision

Display the GitHub login field as **Username**. Keep the API identifier `login`
so existing GitHub responses, workflows and stored values continue to work.
Use the owner-supplied GitHub image as the app logo.

## Evidence

The maintained [object definition](../../../packages/twenty-apps/internal/github-profiles/src/objects/github-profile.object.ts)
uses the same field universal identifier with the new label. The app's refresh
message and README now use Username. The app configuration references
`public/logo.jpeg`, copied unchanged from the supplied image. Scope is source and isolated preview;
production is unchanged.

Native preview readback confirmed the Username label; the app logo download
matched the supplied JPEG bytes.
