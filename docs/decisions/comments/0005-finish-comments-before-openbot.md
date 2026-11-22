# 0005. Finish Comments Before Resuming OpenBot

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments
- Related: [Comments Scope](0004-mention-autocomplete-tabs-and-inbox-preview.md)

## Context

The Comments and OpenBot agents exchanged compatible composer and renderer
changes. Their integration status updates obscured the standalone Comments
app's progress.

## Exchange

- 2026-11-22 Kareem: "Sorry, where are we at?"
- 2026-11-22 Kareem: "Also I paused the opnebot shi for a bit, I wanted to finish this first, and I'll finish the openbot stuff later"
- 2026-11-22 Agent: Refocused the handoff on standalone Comments, checked its preview health, and kept the existing OpenBot work preserved for later.

## Decision

Finish the Comments app first. Leave OpenBot work paused until Kareem resumes
it. Completed integration work can remain preserved; it is not a dependency for
using the standalone Comments preview.

## Consequences

Further Comments work should address its own requirements and remaining privacy
clarification. Do not continue bot delivery, connection, profile or reply work
as part of finishing Comments. This instruction does not authorize deployment.

## Evidence

The standalone branch contains typed mention validation, record tabs and an
incoming Inbox preview through `d20e481f05`. The local backend and frontend
proxy health endpoints returned healthy when this instruction was received.
See the [app README](../../../packages/twenty-apps/internal/comments/README.md)
for verified features and current limits.
