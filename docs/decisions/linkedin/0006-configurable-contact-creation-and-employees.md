# 0006. Make Contact Creation Configurable And Follow Employee Rules

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [area index](DECISIONS.md), [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)

## Context

Automatic Person creation needs user control and must avoid creating new CRM
contacts for internal employees participating in LinkedIn conversations.

## Exchange

- 2026-11-21 Kareem: "are we handling auto-creation? If not:

Okay implement it; it should be configurable like eamil creation
also need to handle when people are employees
like our internal employees"
- 2026-11-21 Agent: asked whether an internal employee should only link an existing Person or be created as a Person marked internal.
- 2026-11-21 Kareem: "Idk, look how email/calendar handles it"
- 2026-11-21 Agent: inspected native email/calendar contact creation, which excludes self/workspace members and can match both Person and Workspace Member identities.

## Decision

Offer None, Sent, and Sent and Received contact-creation settings. Follow native
email/calendar employee handling: do not auto-create People for recognized
internal members; reuse an existing Person by exact LinkedIn identity and
attribute native message participants to the Workspace Member when unambiguous.

## Why

Kareem delegated the employee choice to the existing product behavior rather
than selecting a new internal-Person flag. The current None default is preserved.
LinkedIn profiles lack the email-domain identity used by native email rules, so
workplace-domain inference cannot be copied literally.

## Consequences

The member directory uses owned connected-account stable IDs, profile URLs and
channel handles. Known employees skip name fallback and automatic creation under
all policies. Conflicting identities suppress creation without attributing a
member. Unknown coworkers cannot be identified from a name or LinkedIn hostname
alone; no claim is made that all employees are discoverable.

## Evidence

Unit checks cover all policies, stable IDs/profile aliases, conflicting identities,
late identity resolution, exact Person reuse and participant attribution. A real
preview ingestion check with simulated employee messages confirmed no automatic
Person creation, Workspace Member attribution and reuse after an existing Person
was added.
