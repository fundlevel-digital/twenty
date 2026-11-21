# 0005. Roll Out Six Sessions To The Live CRM

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: release operations
- Related: [Previous deferral](0004-defer-production-deployment.md), [LinkedIn cancellation](linkedin/0009-cancel-the-production-deployment.md)

## Context

The YouTube, dashboard/attribute, Slack, computed-field, LinkedIn and PlusVibe
sessions have merged code on main. Some app changes are live; the core upgrade,
native messaging rebuilds and existing-data migrations remain outstanding.

## Exchange

- 2026-11-21 Kareem: "We just did a bunch of work in these sessions:"
- Kareem linked Conductor workspaces 901, 887, 899, 903, 900 and 890.
- 2026-11-21 Kareem: "Can you please roll everything out and deploy it to our live CRM"
- 2026-11-21 Agent: checked session transcripts, merged PRs, live container identities, health and deployment configuration; identified staged LinkedIn/PlusVibe migrations and the stale LinkedIn layout widget.

- 2026-11-21 Agent: asked about internal Slack app credentials needed for native OAuth.
- 2026-11-21 Kareem: "leave it pending"

## Decision

Resume production rollout of the six sessions, including the core image,
required upgrades, app installation/updates and existing-data migration.
This supersedes the deployment deferral in repository decision 0004 and the
LinkedIn cancellation in decision 0009. Preserve records and native connection
ownership; do not infer ownership or silently discard migration exceptions.
Install Slack while leaving its OAuth and live events pending at Kareem’s request.

## Why

Kareem explicitly requested a combined live deployment after the earlier
individual deployment requests were cancelled.

## Consequences

Use the existing off-host backup system and test upgrades on an isolated copy.
The host's existing prohibition on local backup generation remains in effect.
Record actual deployment and verification outcomes in the rollout handoff;
authorization and merged code alone do not establish completion.

## Evidence

- [Source handoff](../handoffs/2026-11-21-computed-fields-and-preview.md)
- [Slack integration](../handoffs/2026-11-21-slack-main-integration.md)
- [LinkedIn staged cutover](../../packages/twenty-apps/internal/fundlevel-linkedin/README.md#staged-cutover)
- [PlusVibe upgrade boundary](../../packages/twenty-apps/public/plusvibe/README.md#upgrade-boundary)
- Main at preflight: `d8bd3bb0d21933401dc5ce49e3cfe1ad3272775e`.
- Live preflight image: `fundlevel-twenty:4f27f1a4d2-relation-picker`.
- HTTPS health and existing server/database/Redis containers were healthy.

- [Rollout outcome and remaining work](../handoffs/2026-11-21-live-crm-rollout.md): core upgraded, apps installed, PlusVibe associations migrated; LinkedIn migration and Slack activation remain pending.
