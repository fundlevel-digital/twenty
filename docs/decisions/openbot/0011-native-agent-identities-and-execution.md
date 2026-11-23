# 0011. Use Native Twenty Agents For OpenBot

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: OpenBot
- Related: [0008](0008-native-external-assistants.md)

## Exchange

Kareem linked the Twenty CRM Agent Skills session and asked:
"Yo curious; can this not just be a agent?"

Agent inspected the linked session and native Agent implementation, explained
native model execution versus an OpenBot-backed native Agent, and proposed
reusing native Agent identities with an application execution adapter.

Kareem: "Give it a shot, use the twenty agent version"

Agent said it would use native Twenty Agent identities while keeping OpenBot as
the executor, preserve settings and test in the VM without changing live OpenBot.
After an interruption, Kareem: "Yeah, go on".

## Decision

Use real app-owned native Agent metadata for enrolled bots. OpenBot remains the
external runtime and owns its existing routines. The standalone Twenty app owns
configuration/enrollment. No live OpenBot or production changes are authorized.

## Implementation

Enrollment creates a native Agent with the existing bot UUID. Native metadata
migrations/cache invalidation manage its label, active state and ownership.
Public discovery resolves the native Agent, rather than treating a KV profile
as an independent identity. Existing protected bindings retain application-owned
execution routing, request grants and optional image URLs; compatibility API
names and old mention tokens remain readable. New mentions link to native Agent
profiles, and new replies carry the native agent ID.

The implementation reserves the existing model-ID value `external-application`
for the application runtime. This adds no entity column or schema migration.
Such dynamically enrolled Agents are excluded from inferred manifest deletions;
application ownership still governs uninstall. Model overrides cannot turn an
external Agent into an unplanned native model run.

`runAgent()` delegates text requests to the registered application handler and
settles its normal result after the signed callback. Member-scoped in-request
workflow runs also delegate with zero native token usage. These adapters require
a workspace-member execution context; app-only/key-only and background model
runner paths fail explicitly rather than silently invoking a model. Existing
OpenBot Task reminders and app workflow actions retain their own automation
paths. Attachments and structured JSON responses are outside the external text
adapter's contract. Native prompt/skills are not executed by this adapter;
OpenBot continues to run its own agent instructions and tools.

The request-scoped `reply.code` transport and the Conductor callback gate remain
separate concerns. This change does not claim a live OpenBot callback.

## Evidence

Source, isolated checks and preview verification are recorded in the
[native Agent handoff](../../handoffs/2026-11-23-openbot-native-agent-runtime.md). No paid model run or live OpenBot call is needed to
verify the native adapter using the local fixture.
