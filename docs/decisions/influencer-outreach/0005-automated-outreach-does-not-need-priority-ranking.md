# 0005. Automated Outreach Does Not Need Priority Ranking

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Cold And Ghosted Workflows](0002-cold-and-ghosted-workflows.md)

## Context

The agent asked which Ghosted creators Kareem would work on first, implying
a manually prioritized reactivation queue. Kareem corrected that premise.

## Exchange

- 2026-11-23 Agent: "If there are 50 Ghosted creators, what would make you pick one to reactivate first?"
- 2026-11-23 Kareem: "Oh I mean it's all automated so doesn't rly matter;"
- 2026-11-23 Kareem: "Only times I guess I'd prefer that one creator responds faster than the others is if they are potentially part of a deal or they're really good and we want to pitch them, but these aren't like, there's not like really attributes in the CRM that let you derive that. But again, we're not really resource constrained here because it's all automated through cold email sequences and stuff, so it doesn't really matter."
- 2026-11-23 Agent: acknowledged automated sequence execution and removed the assumption that dashboard requirements need a manually prioritized creator queue.

## Decision

Creator priority ranking is not needed for the current dashboard discussion.
Existing outreach runs through automated cold email sequences and is not
meaningfully resource constrained in the way the agent's question assumed.

Creators potentially involved in a deal or particularly desirable for a pitch
can be more urgent, but Kareem says current CRM attributes do not reliably
express that context. This does not request a new priority field or score.

## Why

Kareem expects automated outreach to cover creators without choosing a limited
set to contact first.

## Consequences

This supersedes only record 0002's characterization of reactivation as
"manual workflow requirements." Its stage definitions, evidence requirements,
future ideas and implementation boundaries otherwise remain in effect.

Automated execution of existing sequences does not establish that contact
selection, enrollment, switching POCs or restarting full waterfall rounds are
also automated. Their current behavior remains to be clarified. The earlier
instruction to defer building ranking and enrollment workflows remains in force.

Agent implication: focus the dashboard discussion on outreach coverage,
progress and gaps that need intervention. No final layout or new automation
has been approved or implemented.

## Evidence

Source: Kareem's attached `chat-reply-2026-11-23_09-56-34.txt`, read in this
conversation on 2026-11-23. Current production automation was described by
Kareem; no live execution or configuration was inspected.
