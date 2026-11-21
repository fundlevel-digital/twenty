# 0008. Make contact creation configurable and exclude internal employees

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "Are we doing this already? And, are we auto-creting leads like email/calendar does?"
- 2026-11-21 Agent: Confirmed existing-person matching was implemented, but automatic Person/Company creation was disabled; explained that preview contacts came from the one-time import.
- 2026-11-21 Kareem: "Okay implement it; it should be configurable like eamil creation"
- 2026-11-21 Kareem: "also need to handle when people are employees"
- 2026-11-21 Kareem: "like our internal employees"
- 2026-11-21 Agent: Implemented member-scoped None/Sent/Sent and received policies, email exclusions and employee-domain rules, reusing native email contact creation.

## Decision

Automatically create eligible Slack contacts when the member enables an email-style creation policy. Exclude internal employees rather than turning them into new leads.

## Why

The owner wanted the same configurable behavior as email and explicitly called out internal employees.

## Consequences

Default is None. Sent applies to messages authored by the connected Slack account; Sent and received also permits incoming messages. Group-address and personal-email exclusions use native email classifiers. Full internal Slack members, connected accounts, Twenty workspace members, employee domains/subdomains, bots, deactivated users and unknown Slack membership are excluded from creation. Guests may be eligible. Existing contacts remain linked. Native email creation supplies duplicate handling, company reuse, restores and name enrichment.

## Evidence

App contact-preferences.ts and map-message.ts; native ApplicationMessageContactCreationService; optional participant contactEmail; native app-channel contact settings. 77 app tests, 23 focused server tests and direct VM API/DB creation checks passed. Settings persisted across browser reload; live OAuth is still pending.
