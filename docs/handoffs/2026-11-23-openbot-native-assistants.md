# OpenBot Native Assistants — 2026-11-23

## Scope And Ownership

Extends the [standalone OpenBot app](../../packages/twenty-apps/internal/openbot/README.md)
with native Inbox assistant mentions and attributed replies. Kareem approved the
shared host/engine extension in [decision 0008](../decisions/openbot/0008-native-external-assistants.md).
The existing app owns settings, credentials, delivery, Tasks, workflows and the
optional Comments bridge. Ada remains the native model assistant. OpenBot does
not create human accounts or modify any live OpenBot installation/routines.

## Runtime Contract

- Native app-only metadata APIs register/list owned assistants, read a request
  grant and reply to it. Registration checks handler ownership and preserves a
  stable UUID. Active identities expose their app name in the native picker.
- Settings save/remove synchronize immediately; an app cron reconciles advanced
  variable changes and partial failures every minute. Disabled, removed and
  uninstalled profiles leave discovery. Past messages keep saved attribution.
- The composer submits explicit selected assistant IDs with its text. Quoted
  mentions, code and copied raw references do not trigger delivery by themselves.
  Up to five selected assistants receive the current message text, without
  history or attachments. Existing human DMs reject external assistants.
- Core checks source-thread/member access, stores app-scoped seven-day grants,
  and invokes the owning logic function with the original member context and
  only a request ID. The app fetches the canonical authorized message. Reading
  or answering rechecks the source member, thread, message and selected identity.
- Core uses protected `external-assistant:` CONFIG_VARIABLE entries in existing
  app/workspace KV. Grants retain a source-text digest rather than another body
  copy. Ordinary app KV writes cannot overwrite this namespace. No entity or
  schema migration was introduced.
- The existing signed webhook protocol delivers `crm.inbox.mentioned`. Replies
  use deterministic message IDs and a transaction-scoped lock: retries return
  success without duplicate activity; a conflicting answer is rejected. Native
  requests create no publicly readable Bot Request/claim receipt. App-private
  delivery KV still stores the text required for webhook retries.
- Existing record/task notification callbacks now use `externalAssistantId` for
  the same author identity, while preserving application thread ownership.
  Native replies cannot trigger other assistants.

The repository SDK exports registration, own-directory, request and reply
helpers. The installed app remains on published SDK 2.59.0 and uses equivalent
metadata RPC through its local adapter. These host changes must ship alongside
the app; the existing published SDK/stock host alone cannot provide this feature.
Only the OpenBot provider is implemented. The generic core contract can support
another app/provider later; a Grok adapter is not included.

## Verification

- OpenBot: 47 tests and direct app typecheck passed; CLI app build/apply succeeded
  against the isolated preview.
- Core: 31 targeted tests passed for grants/ownership/access/expiry, protected KV,
  notification attribution and stored recipient context.
- Frontend: 42 targeted tests passed for mentions, author identity, composer send
  and editor rendering. Shared identity validation: 2 tests passed.
- Changed backend files: 22-file TypeScript semantic check passed. Changed
  frontend source: 14-file semantic check passed. Backend SWC build, SDK
  logic-function Vite build and metadata GraphQL generation passed.
- Changed-file server and frontend lint passed without warnings. Full server
  tsgo exceeded the VM memory limit; it is not reported as passing.
- Isolated live API roundtrip: member message → granted app handler → signed
  local fake webhook → one native answer in the original thread. No native model
  was called. Signed duplicate returned 200, conflicting answer 409; public native
  request/claim receipt count remained zero.
- Rename, disable/reject, removal, re-enrollment with the same ID and idempotent
  reconciliation passed. A human session could not invoke app registration.
- Standalone Send/Get Status, signed callback and permission-checked optional
  bridge passed without creating a Comments record. Its Inbox answer retained
  the registered bot author.

- Source browser verified native assistant suggestions, Enter selection, member
  send, same-thread signed reply and saved bot author, with zero page errors.
  The no-provider banner now explains that an assistant mention can send a request.

## Isolated Preview

[VM preview](https://fundlevel-w928.conductor.show/) uses source Vite, rebuilt
backend/worker and the standalone app, with existing seeded records/preferences
preserved. Demo bots point only at the local fake webhook. Server/worker fetches
reject non-loopback destinations. Local supervisors restart exited processes;
this does not promise recovery after VM shutdown.

A fresh browser login verified prefilled email/password and no-typing sign-in.
Browser checks use local TLS and hostname mapping, bypassing Conductor's edge;
the public URL still has Conductor's sign-in gate. Screenshots and runtime
credentials stay in ignored `.context/`. No paid model, production deployment or
live OpenBot call was used.
