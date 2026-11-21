# 0007. Use Apps Preferences for Owned Import and Sharing Controls

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

The initial controls were presented as workspace application settings. All
imported mail also shared one visibility level, while outreach and personal
Unibox messages needed different policies.

## Exchange

- 2026-11-21 Kareem: "also should be config on wheater the auto create people from leads or not"
- 2026-11-21 Kareem: "also, outreach can be fully visbile but unibox shi should be configurable sharing like emails r"
- 2026-11-21 Kareem: "Please utilize the "app preferences" (like the linkedin app) vs. settings/config"
- 2026-11-21 Agent: moved controls to a USER Sync menu item and scoped preference/selection/import actions to the owning connection.

## Decision

Expose the controls at Apps preferences → PlusVibe → Sync. Keep campaign
outreach fully shared. Let each connection owner choose native Unibox sharing:
Metadata Only, Subject, or Everything. The owner retains full access. Make People
creation configurable here; record 0009 specifies its final policies.

## Why

Kareem chose the LinkedIn-style personal app preferences surface and asked for
email-style privacy on Unibox rather than one public setting for all mail.

## Consequences

Campaign history and campaign-send events use fully shared outreach channels.
Unibox history, manual sends and replies use channels governed by the owner's
preference, including replies associated with campaigns. Saving privacy updates
that owner's existing Unibox channels, preserving public outreach channels.
Member checks protect changes even if the caller manages applications.

The provider scope change required a new provider identity, not mutation of the
old one. Old mixed-channel history still requires migration before production
reimport; see record 0001 and the README.

## Evidence

- Local commit `75081446c1`.
- Tests cover per-connection preference isolation, owner checks, outreach versus
  Unibox visibility, and lack of implicit Person creation by native ingestion.
- Native Apps preferences and saving existing preferences verified in the VM.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
