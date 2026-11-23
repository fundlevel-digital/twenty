# 0008. Install PlusVibe And Cal.com In Sunny’s Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: repository; Sunny preview apps
- Related: [0007](0007-sunny-live-state-vm-preview.md)

## Context

The preview initially preserved Sunny’s live installations. PlusVibe and Cal.com were registered on the shared instance but not installed in Sunny.

## Exchange

- 2026-11-22 Kareem: "Can u please install the plusvibe and cal.com app to this workspace preview"
- 2026-11-22 Agent: resolved orphaned registration ownership in the clone through the metadata API, reviewed additive plans and applied the apps using a dedicated preview CLI remote.

## Decision

Install both apps into Sunny’s VM preview. This request does not select provider accounts, enable history imports, register external webhooks or change production.

## Why

Kareem explicitly requested these installations in the existing preview.

## Consequences

Sunny gains the apps’ objects, fields, navigation, connection providers, settings and functions. Their provider connections remain unconfigured. Preview background-integration restrictions remain in place.

## Evidence

The Cal.com plan contains 137 creates; PlusVibe contains 861 creates. Both plans use `--no-prune`. Runtime verification and final install results are recorded in the [preview handoff](../handoffs/2026-11-22-sunny-preview.md).
