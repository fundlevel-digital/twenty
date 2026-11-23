# 0008. Reuse Native Twenty UI Components

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: repository

## Context

Kareem supplied a screenshot of the Twitter app's X Link Field dropdown. The
app used a styled HTML select, even though its installed Twenty UI package
already exports a native Select component. The existing design guidance called
for reuse, but did not explicitly cover SDK app controls in the repository rule.

## Exchange

- 2026-11-22 Kareem: "pelase always use twnety CRM native components when they're available, unless something we're building requires something new/custom"
- 2026-11-22 Kareem: "Please document this and save it as rule/skills"
- 2026-11-22 Agent: verified the app's published `twenty-ui` 2.59.0 exports the native compound Select and applied the rule to SDK app front components as well as the host CRM.

## Decision

Use existing Twenty CRM components whenever they support the required behavior.
Create new/custom UI only when the feature requires a capability that existing
components cannot support. Save this preference as a shared repository rule and
skill so it applies to future work, including SDK apps.

## Why

Kareem explicitly requested native component reuse and its durable documentation.
The dropdown screenshot identifies a concrete case where an existing native
component should have been used. The custom-UI exception remains part of his
instruction; it is not a blanket prohibition on new components.

## Consequences

The Ruler source and `DESIGN.md` explicitly include SDK app front components.
The shared native UI skill describes component discovery, checking the installed
package version and verifying embedded-runtime behavior. Generated repository
instructions are refreshed from Ruler, preserving its ownership of those files.
The Twitter app's four relation-setting controls use the native Select, with
preview verification documented in the existing handoff. Live deployment remains
outside this follow-up.

## Evidence

- This conversation and dropdown screenshot, 2026-11-22.
- [Ruler Source](../../.ruler/instructions.md).
- [Design Guide](../../DESIGN.md).
- [Native UI Skill](../../.agents/skills/twenty-native-ui/SKILL.md).
- [Twitter Handoff](../handoffs/2026-11-22-twitter-analytics.md).
