# 0004. Open Related Records From Full Chips

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Source Record Chips](0003-source-record-chips-for-related-values.md)

## Context

The preview limited record navigation to the source avatar. Kareem wanted to open
the related records from the displayed chips. He also supplied a screenshot of
overlapping disabled-choice descriptions in the relationship picker.

## Exchange

- 2026-11-22 Kareem: "almost good, I jsut want to be able to acc openm the related stuff"
- 2026-11-22 Agent: proposed making the full related-value chip clickable.
- 2026-11-22 Kareem: "also this UI is broken"
- 2026-11-22 Agent: reproduced the Chats picker and measured 32px rows containing 68px labels; disabling flex shrink restored their natural 84px height.

## Decision

Allow the chip text, avatar and background to open the source record. Support
keyboard activation, preserve existing nested field actions, and keep navigation
restrictions for unavailable source pages. Fix the picker descriptions so rows
retain their natural height inside the scrolling group.

## Why

The owner explicitly requested usable related-record navigation and reported the
broken menu. The source remains the record identified by each chip's avatar, as
in the existing presentation; this is an extension of that navigation target.

## Consequences

Reuse the existing mouse-down navigation and record side panel. The avatar is
part of the full chip rather than a separate button. A targeted shared Dropdown
layout fix prevents its immediate children from shrinking in a bounded column.
No CRM data/schema change or production rollout is authorized by this update.

## Evidence

Owner screenshots and native browser reproduction in this conversation.
Implementation and verification continue in the
[Related Value Chip Handoff](../../handoffs/2026-11-22-related-value-chips.md).
