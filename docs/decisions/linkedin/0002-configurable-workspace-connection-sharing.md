# 0002. Share Connections With The Workspace By Default

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [area index](DECISIONS.md), [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)

## Context

The rebuild needed an explicit default for connection records, independently of
native message-body visibility.

## Exchange

- 2026-11-21 Agent: asked whether connections should be workspace-wide or owner-only.
- 2026-11-21 Kareem: "2. Workspace wide by default, but configurable"
- 2026-11-21 Agent: implemented a separate connection visibility setting and verified native record sharing with two members.

## Decision

Connections default to Workspace. The owning member can choose Only Me.
Message sharing remains a separate native channel setting; its current default
is Metadata. Accounts and internal synchronization records remain private.

## Why

Kareem explicitly wants shared connections with a configurable restriction.
A setting label alone must not stand in for API enforcement.

## Consequences

Implementation uses native private records and explicit owner/application grants.
A core fix prevents embedded application/agent grants from expanding the caller's
private-record access. This core fix and native privacy setup are prerequisites
for production owner-only mode. Built-in roles are not edited.

## Evidence

In the preview, changing 1,470 owned connections left the owner with all 1,576
workspace connections and the other member with 106. Restoring Workspace made
all 1,576 visible to both again. Direct member, administrator and embedded-token
checks also verified private account isolation.
