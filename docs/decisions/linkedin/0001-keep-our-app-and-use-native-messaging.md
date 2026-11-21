# 0001. Keep Our App And Use Native Messaging

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [area index](DECISIONS.md), [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)

## Context

Two LinkedIn apps were installed: our connection/history sync and the official
app's native messaging integration. Kareem preferred to keep our app and bring
in the useful official behavior.

## Exchange

- 2026-11-17 Kareem: "Yo can u plz make it so that I config proxy on login for the linkedin app"
- 2026-11-17 Agent: investigated a custom proxy screen.
- 2026-11-17 Kareem: "Bro? wtf? there's just an option to create a login link that let's the user set the proxy ON login"
- 2026-11-19 Kareem: "OKay, I still prefer having our own app, but I like the idea of storing as msgs, per user connections, configuration (privacy, etc.)

Basically examine the linekdin app (official) and find the parts that are rly good and bring into our own (u can propose to me first)"
- 2026-11-21 Agent: proposed core messages, member connections/settings, retained connections/invitations, resumable history/catch-up and migration before retiring custom Chat/Message objects.
- 2026-11-21 Kareem answered the migration question: "1. Yeah"
- 2026-11-21 Kareem: "Go ahead w/ the rebuild"
- 2026-11-21 Agent: later identified privacy, migration/retirement and end-to-end checks as remaining.
- 2026-11-21 Kareem: "ok do it all"

## Decision

Keep the existing LinkedIn Sync application identity. Adopt native messaging,
member connections/settings and hosted sign-in with proxy/country controls.
Retain connection/invitation synchronization. Migrate and reconcile legacy
messages before retiring the custom Chat/Message schema.

## Why

This combines the native conversation and privacy surfaces with our existing
connection and history coverage, without introducing another installed app.

## Consequences

The rebuild retains the app identifier, registers connection/messaging providers,
adds history and catch-up jobs, and retires legacy objects in the preview only
after verification. Legacy definitions remain as migration-stage templates for
a future staged production cutover.

## Evidence

The corrected attached Claude transcript records the November 17/19 exchanges.
The current Conductor conversation supplies the approvals. Preview reconciliation
matched all 821 source messages and 144 message-bearing threads with zero text,
timestamp or thread-ID mismatches. See the app README and handoff for commands
and limitations.
