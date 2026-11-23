# 0004. Ghosted Classification Currently Uses Judgment

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Cold And Ghosted Workflows](0002-cold-and-ghosted-workflows.md)

## Context

The agent asked how Kareem distinguishes a Ghosted conversation from one
simply awaiting a reply.

## Exchange

- 2026-11-23 Agent: "Do you use a rough combination of elapsed time and unanswered follow-ups, or is it usually a judgment call based on the conversation?"
- 2026-11-23 Kareem: "Yeah it's not super well defined; it's kinda a intuative thing ykim?"

## Decision

Document the current classification as an intuitive judgment. Kareem has not
defined a fixed elapsed-time or unanswered-follow-up threshold for Ghosted.

## Why

This reflects Kareem's description of current practice without inventing a
formal stage-entry rule.

## Consequences

The dashboard requirements include last inbound/outbound dates, follow-up counts
and conversation context to support reviewing the stage. An automatic Ghosted
classification rule remains unapproved; this does not rule out defining one later.
No application or live configuration was changed.

## Evidence

Source: Kareem's attached `chat-reply-2026-11-23_09-43-35.txt`, read in this
conversation on 2026-11-23.
