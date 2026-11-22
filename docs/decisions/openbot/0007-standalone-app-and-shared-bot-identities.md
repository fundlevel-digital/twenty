# 0007. Standalone OpenBot App And Bot Identities

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [0006](0006-bot-settings-and-task-assignment.md), whose Comments ownership is superseded

## Exchange

Kareem: "Bruh why arr u extending the comments app? THis was never what I intended , I only intended for u to make a standalone \"OpenBot\" app and make it in a way where it could work with comments, tasks, etc."

Kareem: "If u need to improve the comments app more, so like it can also take bots, that's fine, but openbot should be it's own app"

Kareem: "U can maybe create a new user class, called \"Bots\" or something ? idk, maybe then we can also make adapters for grok bot, etc."

Kareem: "Please also use this image for the OpenBot app: .context/attachments/assets/8a81e192-8e3d-4c5b-bdb7-f258754a0985/idBVHI7eaH_logos (2).png"

Agent acknowledged that bundling OpenBot ownership inside Comments was incorrect.

## Decision

OpenBot is a separate installable app with its own identity, supplied logo,
settings, encrypted credentials, delivery storage and workflows. Comments is an
optional consumer, and Tasks use bot identities rather than fake human accounts.
A provider boundary must allow future adapters; Grok support is not claimed until
implemented. The supplied artwork is copied unchanged into the app assets.

## Boundaries And State

Do not access or change the live OpenBot. Existing preview data must be preserved
through the ownership correction. The separate app and optional Comments adapter are implemented and installed
only in the isolated preview. Task assignments and native comment history were
preserved during the preview ownership correction. No production deployment is
claimed. See the [verification handoff](../../handoffs/2026-11-22-openbot-standalone-preview.md).
