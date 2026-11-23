# 0001. Temporary Manual Workflow And Data Preview

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Influencer Enrichment
- Related: [Preview Handoff](../../handoffs/2026-11-23-influencer-enrichment-preview.md)

## Context

Kareem supplied an enrichment playbook and requested a Twenty workflow with real
influencer data available for the next implementation steps.

## Exchange

- 2026-11-23 Kareem: "I wanna actually make this into a workflow on Twenty CRM; can u spin up a preview and copy over all the influencer data (influencers, point of contacts, yt channels, x profiles, etc.)"
- 2026-11-23 Kareem: "like spin up a preview on ur vm"
- 2026-11-23 Agent: checked the existing deployment and prepared a separate VM database and runtime.
- 2026-11-23 Kareem: "Like just setup a temp workflow (literally just a manual trigger node) and that's it"
- 2026-11-23 Kareem: "Then I'll go into momre detail later"

## Decision

Create an isolated Twenty preview on this VM, populated with influencer records,
contacts, social profiles and their relationships. Create a temporary workflow
containing only a manual trigger. Defer enrichment actions until further teaching.

## Why

Kareem explicitly limited the immediate workflow to a manual trigger.

## Consequences

The workflow is a draft with one manual trigger and zero action steps. Production
access is read-only. Provider connections, live credentials and existing active
automations are excluded or disabled in the copy. No enrichment batch, outreach,
merge or production deployment is authorized by this decision.

## Evidence

The linked handoff records copied counts, verification, runtime isolation and
remaining limitations. Preview data and private transfer state remain untracked.
