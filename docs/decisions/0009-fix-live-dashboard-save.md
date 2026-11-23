# 0009. Fix The Live Dashboard Save

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: dashboard save and release operations
- Related: [Failure And Fix](../handoffs/2026-11-23-record-table-widget-save.md)

## Context

A dashboard save in the live CRM failed because a view creation request reused
an existing primary key. The agent prepared a local fix but stopped before
releasing it.

## Exchange

- 2026-11-23 Kareem: "Live CRM; https://crm.fundlevel.co/object/dashboard/c5715902-b655-4ffe-bf95-6e686dde9a0b"
- 2026-11-23 Agent: reported the local patch had not been deployed.
- 2026-11-23 Kareem: "Are u gonna fix it or what bro"
- 2026-11-23 Agent: acknowledged stopping early and committed to verifying, deploying and checking the affected dashboard.

## Decision

Carry the reported live-CRM bug through verification and release. In this
exchange, the correction supplies authorization to deploy the targeted fix;
this is the agent's interpretation of the request in its live-CRM context.

## Why

A local patch does not resolve the failure in the live CRM Kareem identified.

## Consequences

Reuse the established pinned-image deployment process, preserve runtime
configuration and data, and verify offsite backups before cutover. No schema
migration or app reinstall is required for this frontend save fix.

## Evidence

See the linked handoff for observed errors, source changes, checks, release
identity and actual deployment state. Authorization alone does not establish a
successful deployment.
