# 0009. Apply Email Creation Policies and Exclude Internal Employees

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

A simple People-creation boolean was available. Kareem asked whether creation
was handled, requested the email/calendar configuration pattern, and identified
internal employees as a group that needed special treatment.

## Exchange

- 2026-11-21 Kareem: "are we handling auto-creation? If not:"
- 2026-11-21 Kareem, continuation: "Okay implement it; it should be configurable like eamil/calendar creation"
- 2026-11-21 Kareem, continuation: "also need to handle when people are employees"
- 2026-11-21 Kareem, continuation: "like our internal employees"
- 2026-11-21 Agent: proposed email policy choices, always excluding workspace members and senders, default business-domain exclusions and editable additional domains.
- 2026-11-21 Kareem: "mail.fundlevel.co; fundlevel.co"
- 2026-11-21 Kareem: "legalos.ai too"

## Decision

Provide Sent and Received, Sent, and None People Auto-Creation policies, per
connection. Only qualifying email activity may create a new Person; importing a
lead directory or a bounce/label event alone does not. Existing People continue
to match with any policy.

Always exclude workspace-member addresses and source sending addresses/aliases
from automatic creation. Enable coworker-domain exclusion by default, infer
business domains from workspace members/source senders, and allow explicit
additional domains. Configure the three owner-specified domains on the preview
connection, including their subdomains.

## Why

This follows the familiar email policy while protecting the owner's employees.
People on public email providers must not all be mistaken for coworkers, and
lookalike domain suffixes must not match the internal-domain list.

## Consequences

Legacy true maps to Sent and Received, false to None. Defaults are not
hardcoded to the owner's company domains; those are saved connection preferences.
Employee lookups paginate and stop creation if they fail. The app role gains
read-only Workspace Member access without member create/update permission.

No existing Person is deleted or detached by an exclusion. Unmatched provider
Leads remain available. The preview keeps Sent and Received, employee exclusion
on, the requested internal domains, and Unibox Metadata. No sync was started.
Changing policies or domains remains available in Apps preferences.

## Evidence

- Local commit `04552bccae`; 142 app tests passed, direct tsgo and oxlint passed.
- Both employee GraphQL lookup shapes accepted by the real VM schema.
- Tests cover direction policies, directory-only imports, exact members/senders,
  aliases, subdomains, lookalikes, public providers, pagination, lookup failure,
  old preference migration, domain validation and existing Person matches.
- Actual light/dark browser checks saved the owner domains and confirmed them
  after reload; no browser page errors. Production was not updated.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
