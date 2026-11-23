# 0016. PlusVibe Senders Are Owned Historical Inboxes

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Source Sync Repair](0013-repair-source-outreach-sync.md), [Current Diagnosis](../../../../../handoffs/2026-11-23-plusvibe-sync-diagnosis.md)

## Context

Kareem reported missing leads and showed a creator address incorrectly listed
as a PlusVibe Sender. The dashboard discussion relies on distinguishing owned
inboxes from contacts, including historical inboxes no longer accessible.

## Exchange

- 2026-11-23 Kareem: "What ever happened to our plusvibe syncing?"
- 2026-11-23 Kareem: "It's clearly missing so much data"
- 2026-11-23 Kareem: "Like there's only 7k leads and PV fndlevel workspace has > 15k"
- 2026-11-23 Kareem: "wtf is this? PlusVibe senders were meant to only be OUR historicaly plusvibe inboxes; not literally the sender of every emial"
- 2026-11-23 Agent: confirmed the failed lead-directory checkpoint, incomplete message history and an incorrectly classified historical sender with six associated messages. No live repair was performed during these diagnostic reads.

## Decision

PlusVibe Senders represents the owner's organization-side current and historical
PlusVibe inboxes. Creator, lead and other external From addresses do not become
PlusVibe Senders merely because they sent an email. Historical owned inboxes
remain relevant even if no longer connected or accessible.

## Why

Kareem explicitly clarified the intended meaning. Reactivation and inbox reply
analysis depend on identifying the organization's inbox that received or sent
the message, separately from the external participant.

## Consequences

Incorrect sender relations need evidence-based repair, including message,
conversation and source-link associations. Deleting sender records alone
would not repair wrongly mapped participants. Do not delete or reclassify all
addresses absent from the currently connected account list: historical owned
inboxes must remain represented.

## Evidence

The attached screenshots show 7,245 Twenty Leads, 15,814 Total Leads and 11,865
Total Contacted in PlusVibe, and an external address listed as a sender. Source
dashboard totals have not yet been reconciled to provider API counting semantics.

Authenticated live reads found 7,245 Leads, 1,480 PlusVibe Messages, 807 Threads
and 160 Senders. The screenshot's sender has six linked messages, all created
on 2026-11-21; its address appears in both FROM and TO participant roles on each.
This establishes a historical data defect, not just a display label issue.
No customer identities or message contents are retained in this record.
