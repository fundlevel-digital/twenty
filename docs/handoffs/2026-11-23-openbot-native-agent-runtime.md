# OpenBot Native Agent Runtime

The standalone OpenBot app now enrolls bots as real app-owned Twenty Agents.
OpenBot still executes their manually configured routines. This implements
[Kareem’s approval](../decisions/openbot/0011-native-agent-identities-and-execution.md)
and updates [draft PR #24](https://github.com/fundlevel-digital/twenty/pull/24).
No production deployment or live OpenBot change was performed.

## Identity And Execution

Enrollment uses native metadata migrations/cache invalidation to create or
update Agent labels and active state. Existing bot UUIDs are preserved as native
Agent IDs and universal identifiers. Protected bindings retain application
ownership, handler routing and optional avatars; discovery resolves native
metadata. Ordinary app updates retain dynamically enrolled Agents, while
uninstall still follows their application ownership.

The reserved existing model ID `external-application` routes execution to the
application. No entity column or database schema migration is introduced.
Overrides cannot switch this runtime to a native model. Native Agent settings
show external execution instead of model/prompt controls. New mention chips
link to native Agent profiles; old mention tokens remain readable. Replies and
turns carry the actual Agent ID, with the owning application retained.

Native `runAgent()` accepts member-scoped text requests and settles after the
signed app callback. `waitForCompletion: false` returns the run/conversation IDs;
true waits using the native settlement service. The app’s **Run OpenBot Agent**
workflow action starts asynchronously, avoiding a logic-function timeout while
an external routine runs. The native in-request Agent runner supports member
contexts with zero native token usage. These paths bypass native model execution.

The existing Task assignment/reminder workflows, app settings and optional
Comments adapter remain available. See the [app operating guide](../../packages/twenty-apps/internal/openbot/src/openbot/README.md).

## Verification

- 34 targeted backend tests cover native metadata enrollment, ownership,
  idempotency, archive/rename, manifest retention, model override protection,
  native API/in-request routing and callback completion/rejection.
- 43 targeted frontend tests cover mention chips/IDs, sending, model display and
  reply authors. 49 app tests and its direct typecheck pass.
- Changed-source semantic checks passed for 19 backend and 14 frontend files;
  changed backend/frontend lint passed with no warnings. Backend lint used its
  static configuration; this is not a full-package type-aware lint claim.
  Full server typechecking remains outside the VM-memory verification scope.
- Shared, server and SDK logic-function builds passed. The app built and applied
  successfully to the isolated preview, then applied again without Agent deletion.
- Three saved bots were enrolled as native Agents with their original IDs.
  Reconciliation returned zero updates after reapplication; the saved bot
  configuration fingerprint and callback URL were unchanged.
- Every delivery test first checked the current saved target URL was loopback.
  Only the local Preview Bot was called. The test used the actual OpenBot source
  redactor before signing with `reply.code`; its legacy secret alias was redacted.
- Native API execution returned an attributed reply in its conversation. The
  matching native turn and persisted run settlement were both completed. A
  direct waiting `runAgent()` call returned the signed result. Explicit Inbox
  mentions also received a native Agent reply.
- Fresh source-Vite login had prefilled email and password and completed without
  typing. Native Agent profile/settings and Inbox browser checks use the source
  frontend rather than a cached CRM shell. Native Agent settings, profile links,
  persisted replies and the **Agent · OpenBot** mention picker passed with no
  browser page errors.

The [public callback follow-up](2026-11-23-openbot-public-preview-callback.md)
subsequently verifies a separate callback-only HTTPS ingress. The original
Conductor preview URL still rejects external callback POSTs.

## Preview And Limits

Preview: <https://fundlevel-w928.conductor.show/>. Open the standalone app’s Bots
settings to configure connections, or native Agents to inspect their profiles.
The existing database, connections and preferences were preserved when restoring
PostgreSQL, Redis, server, worker and source Vite under detached supervisors.
These restart exited child processes while the VM runs; they do not establish
wake-on-shutdown support.

Browser tests map the preview hostname to local TLS, bypassing Conductor’s edge.
The local fake bot maps only this preview’s exact `/s/openbot/reply` callback to
local TLS. Therefore these tests establish app authentication, signatures,
routing and persistence; they do not establish that a live OpenBot can pass
Conductor’s callback gate. The public preview retains its Conductor sign-in gate.

Owner-configured connections remain in the preview. Server/worker fetch guards
alone do not constrain every app subprocess; tests target only the confirmed
local fixture. No other configured bot was triggered by this verification.

The adapter requires a workspace-member context. App-only/API-key-only and
background native model-runner paths fail explicitly. Attachments and structured
JSON output are unsupported. Twenty does not execute native prompts, skills or
tools for external Agents; OpenBot keeps its own instructions/tools. An
in-request wait can expire before an eventual callback; callers needing an
asynchronous result should use `runAgent()` or the app action and follow its
conversation. Stopping a native model stream does not stop an external OpenBot
routine; cancellation of external work remains outside this adapter.
