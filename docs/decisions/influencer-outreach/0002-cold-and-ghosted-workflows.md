# 0002. Cold And Ghosted Workflows

- Date: 2026-11-23
- Status: superseded by 0005 (manual workflow characterization only)
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Initial Scope](0001-define-stages-before-dashboard-requirements.md), [Deferred Ranking](../packages/twenty-apps/public/plusvibe/0011-defer-poc-ranking.md)

## Context

Kareem explained the two stages and how he chooses outreach and reactivation
actions. Requirements are being discussed; this record does not specify a final UI.

## Exchange

- 2026-11-23 Agent: proposed Cold as no conversation yet, including unanswered outreach, and Ghosted as a conversation that stopped receiving replies.
- 2026-11-23 Kareem, attached Cold reply: "Yes exactly; I'm also thinking it makes sense to seperate these stages into distinct ones, I don't think it makes sense to keep creators we literally never reached out to w/ the ones that we have but never responded"
- 2026-11-23 Kareem, attached Ghosted reply: "Yeah exactly, this requires us to do a few things, which I'll get to in a bit - this can get kinda complex, so my instinct is to give it it's own dashboard page"
- 2026-11-23 Kareem: "Also, I don't think we have linkedin saved, but we also use linkedin as a source of outreach, this will need to be kept in mind for sure;"
- 2026-11-23 Kareem: "One, I need to know how many times have we tried to follow up in a row?"
- 2026-11-23 Kareem: "Second thing I need to know is when was the last time that we followed up? When was the last time that they replied?"
- 2026-11-23 Kareem: "I wouldn't mark them cold, but I would kind of restart cold."
- 2026-11-23 Kareem, attached Cold explanation: "I don't want you to build any sort of rank or anything like that. It's fine for now"
- 2026-11-23 Kareem, attached Cold explanation: "I don't want you to build a workflow for right now."
- 2026-11-23 Kareem, attached Cold explanation: "The goal here really is just to have as much context as possible so that I can A, delegate work to AI, and then B, I can also verify work, right?"
- 2026-11-23 Agent: documented the requirements below, separating confirmed behavior from tentative ideas and unresolved rules.

## Decision

### Stage Meanings

- Cold means no conversation yet. Distinguish creators never contacted from creators contacted without a response; the resulting stage names remain open.
- Ghosted means a prior conversation has stopped receiving replies. Kareem favors a separate dashboard page; final layout is not settled.
- Returning a Ghosted creator to a cold-style contact waterfall does not change their stage to Cold.
- LinkedIn is an outreach channel to account for. Its current saved history is unverified. Detailed LinkedIn contact ordering is outside the current email-waterfall discussion.

### Ghosted Requirements

Show enough evidence to review a Ghosted classification and choose reactivation:

- Consecutive outbound follow-ups without a reply. One or two follow-ups may indicate an incorrect classification; no automatic threshold was chosen.
- Last outbound and last inbound dates.
- The first owned inbox that received a reply, the most recent owned inbox that received a reply, and the most recent sending inbox.
- Sending-inbox changes around the point replies stopped. Kareem considers both deliverability problems and deliberate nonresponse possible explanations.
- The latest reply as direct context, with access to the full thread through expansion or opening it. AI summarization is unnecessary for this requirement.
- Explore identifying owned inboxes and showing usage and replies per inbox, with least/most-used ordering. Metric definitions and final presentation remain open.
- Inbox availability matters: some previously successful inboxes may no longer be accessible.

Reactivation can start from the original responsive inbox or another inbox
Kareem believes works best, subject to access. If unsuccessful, he may run a
reactivation sequence using prior conversation context, repeat outreach, and
eventually restart the POC waterfall while retaining Ghosted status. These are
manual workflow requirements, not instructions to send or enroll anyone.

### Cold Requirements

- Work through contact emails sequentially, generally avoiding simultaneous outreach to multiple POCs. The intended order is POC rank, then email rank; ranking implementation stays deferred.
- Keep unknown identities separate until established. A nameless POC can represent an email of uncertain ownership; a known first name supports personalized sequence wording. Do not merge identities based on an assumed shared owner.
- Identify creators whose outreach has stalled.
- Understand which addresses and POCs have been contacted and how often, plus repeated exhaustion of the available waterfall.
- Use that context to decide whether to resume outreach, find more emails, try another channel such as LinkedIn or phone, or reconsider continued attempts.
- Automated repeated campaign enrollment is a future goal; no workflow implementation is requested now.

### Adjacent Ideas To Revisit

- Average time in each stage would be useful, but manually maintained stages can make it unreliable.
- Deriving In Talks from a reply is a possibility, not a confirmed automatic transition rule.
- Partial Information may need separate states for missing analytics versus missing pricing. Analytics quality/type and integration versus dedicated pricing can also be incomplete. Final definitions remain open for the later stage discussion.
- Kareem generally prefers images of the YouTube analytics dashboard over verbal analytics. AI extraction of country breakdowns into structured data is a future idea, explicitly deferred.

## Why

Kareem wants context that supports choosing actions, delegating work to AI and
verifying that work. The stage alone does not explain what outreach to do next.

## Consequences

Requirements documentation only. No stage configuration, dashboard, ranking,
workflow, sync, campaign enrollment or outreach was changed. Send counts alone
do not establish completed sequences or waterfall rounds; that existing limit
remains in force under the deferred-ranking decision.

## Open Questions

- Whether Ghosted follow-up counts span all POCs/channels or the previously responsive contact; how to show both when needed.
- What waiting period and follow-up pattern distinguish Ghosted from an ordinary pending reply.
- How to identify stalled outreach versus a sequence still running or an intentional pause.
- How sequence attempts, completed sequences and full waterfall rounds should be counted.
- Final names for untouched versus contacted-without-reply stages.
- Available email/LinkedIn history, reliable identity matches, inbox access and sequence evidence.

## Evidence

Source: Kareem's current message and the three attached text files read in this
conversation on 2026-11-23: `chat-reply-2026-11-23_08-13-22.txt`,
`chat-reply-2026-11-23_08-14-00.txt` and
`pasted_text_2026-11-23_08-30-24.txt`. Customer examples and email identities
are deliberately omitted from this record.

The [earlier dashboard handoff](../../handoffs/2026-11-22-influencer-outreach-dashboard.md)
documents incomplete imported history; the [LinkedIn connection decision](../0006-connect-linkedin-after-the-rollout.md)
documents deferred connection setup and history migration. Neither establishes
current live data completeness. No live verification was performed in this discussion.
