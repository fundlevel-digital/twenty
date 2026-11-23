# OpenBot Selection And Reply Compatibility — 2026-11-23

[Decision](../decisions/openbot/0009-recipient-and-task-creation-gaps.md)
records the owner's preview reports and the boundaries of this correction.

## Changes

Native new-chat recipients now include registered external assistants, with
removable chips and explicit delivery IDs. Selecting one is sufficient without
also typing a body mention. Human recipients/channels remain available, and a
conversation containing a bot is kept out of the human-only DM path.

The native Task creation/update form now supports the same human-and-bot
Assignee model as saved records. Bot selection stays in the draft until submit;
backend role/field permissions still govern persistence. Bot options reuse the
existing native picker and display components. No custom control was introduced.

## Reply Finding

The reported bot could read the event but not its callback secret. The old
instructions assumed model access to `data.reply.secret`. The existing fake bot
signed in trusted runtime code, so its passing test did not establish OpenBot
model-driven reply compatibility.

[send-twenty-reply.mjs](../../packages/twenty-apps/internal/openbot/tools/send-twenty-reply.mjs)
is a source-only helper for an administrator-provisioned trusted OpenBot tool.
It takes the delivery ID and answer on stdin, derives the scoped signing key
using protected runtime configuration, and posts to the configured HTTPS CRM
callback. A caller cannot choose the destination or workspace. Its output does
not expose credentials or callback response bodies. It does not install itself,
register a tool in OpenBot, change a routine or bypass the Conductor gate.

The owner must provision that tool/command on the OpenBot host (or use equivalent
trusted signing code) and ensure the callback is externally reachable. This
session did not change the live OpenBot or verify a real OpenBot callback.
The owner reports successful outbound delivery from this preview. The VM's
server/worker fetch preload alone does not establish restrictions on separately
spawned application runtimes; the earlier blanket no-external-delivery guidance
was too broad. This session performs no new live bot deliveries.

## Checks

- Five targeted frontend suites: 67 tests passed, including the added regressions.
- Added regressions cover external recipient-only send with no native model,
  preservation of normal routing, and draft bot assignment without a database write.
- Changed source semantic check: 10 frontend files, zero errors.
- Trusted helper: three Node tests passed, covering signature compatibility,
  configured destination, invalid input and sanitized error output; no network calls.
- Changed-file frontend lint passed without warnings. Browser verified native
  top-recipient search/selection without sending, and selecting a bot in the
  native Create Task Assignee picker. The latter issued zero create/update
  mutations; no Task was saved or assigned during the check.
- The trusted helper also received success from the isolated CRM callback for
  an already-answered local fake-bot request, using the identical saved answer.
  This exercised the real callback idempotently without contacting OpenBot or
  adding another message.

Preview source changes are served by Vite. Existing bot settings, secrets and
Task records are preserved. No bot request or Task assignment is sent to a live
OpenBot as part of these checks. Full repository typechecking is not claimed.
