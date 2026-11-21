# 0009. Replace the plain Slack preferences form with native settings controls

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "that UI looks like shit"
- 2026-11-21 Agent: Acknowledged that the plain form did not fit Twenty and proposed the existing email settings pattern: policy cards, switches, a native domain input and a clearer history section.

## Decision

Reject the plain HTML preferences form and rebuild the Slack surface using Twenty’s native settings patterns.

## Why

The owner rejected the rendered form after viewing the screenshot. The product design guide also requires native component reuse.

## Consequences

The implementation uses native policy radio cards, switches, inputs, buttons and selects. Policy and option changes save automatically; employee domains have their own Save action. Without a connected account, history shows a connection prompt instead of empty selectors. Imported test data is a compact notice. UI verification and final screenshots are recorded in the task handoff.

## Evidence

DESIGN.md; SettingsRadioSettingsCard.tsx and email settings components; Slack front-components/settings.tsx and components/. The rejection is an owner decision; the concrete native layout is the agent’s implementation of that correction.
