# 0010. Make Related Fields And Grouping Available Across The Platform

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: related-columns
- Related: [Single-Value Relation Grouping](0009-single-value-relation-grouping.md)

## Exchange

- Kareem: "Grouping by RF is available everywhere grouping is - right? Across the wholke platform?"
- Agent: explained that the preceding implementation exposed paths only in dashboard tables.
- Kareem: "Ok so I need u to implement it through the whole thing;"
- Kareem: "I also thing relation fields weren't blanket-available, so fix that too"

## Decision

Expand related-field selection and single-value related grouping across CRM
record views, record widgets and chart grouping controls. Preserve the cardinality
boundary from 0009. Reuse native controls and shared rendering/query paths.
Remove rollout and layout restrictions that prevent usable related fields from
appearing. Type-specific actions must continue to validate the terminal field's
capabilities and metadata permissions.

## Evidence

Implemented in the workspace and verified in the isolated preview. The
[platform handoff](../../handoffs/2026-11-23-platform-related-fields.md) records
covered surfaces, source changes, the view schema upgrade, test results and
verification limits. Native selection, persistence, related-value rendering,
chart dimensions and live group movement were verified. Full backend typechecking
exceeded the VM memory limit; scoped backend types passed. Production is unchanged.
Hindsight memory is unavailable because the VM lacks its private profile.
