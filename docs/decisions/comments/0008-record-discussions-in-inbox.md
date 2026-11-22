# 0008. Group Inbox Comments By Record

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments
- Related: [0005](0005-finish-comments-before-openbot.md), [0007](0007-independent-comments-for-any-object.md)

## Context

Comment mentions appeared as application notification conversations in Inbox.
The notification opened the AI composer, including provider configuration errors,
instead of the record's comment threads.

## Exchange

- 2026-11-22 Kareem: "this seems ugly? also seems to break due to AI stuff?"
- 2026-11-22 Kareem: "I wonder if there's a better wayy t osort stuff too? Maybe like dms/channels?"
- 2026-11-22 Agent: proposed a separate Comments section beside DMs and Channels, grouped by record and using the regular comment reply composer.
- 2026-11-22 Kareem: "A Comments section beside DMs and Channels, grouped by record"

## Decision

Organize Comments in its own Inbox section alongside Channels and DMs, with
discussions grouped by target record. Reading and replying use the record's
existing Comments system. OpenBot remains paused and Comments remains independent
of Better Lists.

## Why

The owner selected record grouping. Source inspection also confirmed that a
single-recipient application notification could be classified as an assistant
conversation, explaining the AI provider error in the supplied screenshot.

## Consequences

Implementation uses an optional app front component in the native Inbox. The app
owns discussion queries and replies; the host supplies navigation and redirects
verified Comments notifications into this surface. These are implementation
choices, not additional owner requirements. Record access must be checked as the
caller before returning discussion labels or excerpts.

## Evidence

Implemented and browser-verified on the isolated VM preview on 2026-11-22.
Checks cover record groups, search, incoming mention redirection, a saved reply
and its persistence on the source record, with no AI message mutation or page
error in that path. App tests, focused native Inbox tests and changed native-file
lint pass. The full frontend typecheck hit the VM memory limit. No production
deployment or merge is authorized by this record. Details are maintained in the
[app README](../../../packages/twenty-apps/internal/comments/README.md).
