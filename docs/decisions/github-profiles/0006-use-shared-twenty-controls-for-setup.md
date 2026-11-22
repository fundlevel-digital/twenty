# 0006. Use Shared Twenty Controls For Setup

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [OAuth And Settings](0005-oauth-and-clear-per-object-backfills.md), [Product Design](../../../DESIGN.md)

## Exchange

- 2026-11-22 Kareem, showing the browser-styled token setup link crowded against
  the anonymous-access switch: "wtf w/ u using this bad UI stuff? Please remmeberno to"
- 2026-11-22 Agent: acknowledged the browser link and cramped spacing, and will
  use shared Twenty controls and retain this as a standing UI preference.

## Decision

App UI must look native to Twenty, including setup instructions and external
links. Use shared Twenty components and normal layout spacing; do not leave
browser-default links or unthemed controls in product settings. Follow
`DESIGN.md` and verify the result in its actual page in light and dark mode.
This reinforces the existing design-system requirement rather than introducing
an exception for app setup screens.

## Implementation

Both GitHub setup links now use the shared Twenty Button's supported link
behavior, with neutral outline styling and unchanged external destinations.
The anonymous-access setting is inside the section's shared spacing container.
The switch itself already uses Twenty's shared Switch.

Scope is source and isolated preview only. The project decision index retains
this owner correction. Remote Hindsight recall/retention is unavailable because
the VM lacks its private repository profile; no remote-memory write is claimed.

## Verification

Package typecheck and lint passed. The isolated preview was updated. A fresh
browser verified both theme settings: setup links rendered as shared outline
buttons, 32px high without browser underline, with 16px spacing above the switch.
Both destinations remained correct and no page exceptions occurred.
