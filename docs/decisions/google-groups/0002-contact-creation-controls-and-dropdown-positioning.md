# 0002. Add Contact Creation Controls And Fix Dropdown Placement

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Google Groups
- Related: [Initial preview](0001-build-configurable-google-groups-preview.md), [handoff](../../handoffs/2026-11-22-google-groups-preview.md)

## Context

The initial app linked existing People without creating contacts. Kareem subsequently configured Google and a Group, requested creation controls, and reported a detached dropdown after scrolling.

## Exchange

- 2026-11-22 Kareem, attached reply: "WE'll prolly want the settings for this, like option to create everyone, only recipeitcs, only senders, etc."
- 2026-11-22 Kareem, screenshot annotation: "ui looks a little fucked here, too low select"
- 2026-11-22 Kareem: "K i set it up and stuff"
- 2026-11-22 Agent: proposed Never, Senders Only, Recipients Only and Everyone, with Never as the default, preserving the owner's saved setup.

## Decision

Add configurable contact creation to Google Groups and repair dropdown placement in the existing preview. Preserve the owner's configuration. The reported setup completion does not request an agent-triggered Gmail import or outbound message.

## Consequences

The implementation offers four creation policies. Recipients includes To, Cc and Bcc. An unambiguous primary-email match links an existing Person regardless of policy. Existing People are never overwritten; ambiguous matches remain unlinked. The connected mailbox, its sending identities and configured Group addresses are excluded. Never is added on read for older preferences without rewriting their revision or stored settings. Saving a policy uses the app's existing fresh-backfill revision behavior.

Native Twenty selects now use an owned relative wrapper and an absolute positioner without a portal. The sandbox portal's coordinate origin caused detachment after host-page scrolling. No host frontend change was needed.

## Evidence

- Implemented in [app source](../../../packages/twenty-apps/public/google-groups/README.md) and applied only to the existing isolated Sunny preview.
- 55 tests across six suites passed, including policy/role combinations, ambiguous matches, self-address exclusion, concurrent creation and saving a policy without importing. Typecheck and lint passed.
- Installed-app browser checks after scrolling measured a zero-pixel gap and matching left edges for account, contact policy and history dropdowns. History flipped upward at the viewport boundary. No page errors were recorded.
- Read-only runtime comparison preserved the selected connection, Group settings, processing preference and revision. The added policy reads as Never. No live Gmail import, real contact creation or send was performed by the agent.
- Browser verification used the configured hostname through local TLS/host mapping and bypassed Conductor's edge. Real-provider contact creation remains unverified.
