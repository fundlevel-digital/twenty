# 0001. Draft Replies In The Latest Influencer Thread

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: email-sequences

## Context

Kareem initially asked about connected-mailbox email sequences that continue existing conversations. After reviewing a workflow screenshot, he requested a workflow for an influencer's existing conversation.

## Exchange

- Kareem: "Just make mea. workflow for this;\n\nBasically wanna select the last active thread w/ a influencer"
- Kareem: "and draft reply to their most recent email"
- Agent: proposed selecting the latest active conversation and drafting a reply to the influencer's latest incoming email within it, using the mailbox that owns that conversation.

## Decision

Implement this request as a manually launched workflow on an Influencer. Find the latest active eligible email conversation across that influencer's linked contacts and draft a reply to the latest incoming email from a linked contact within that conversation. Sending and sequence scheduling are outside this workflow request.

## Evidence And State

- The source exposes native `DRAFT_EMAIL` workflow actions and an `inReplyTo` email input. The email composer resolves the parent's provider thread identifier and References headers.
- The existing Mac CRM setup script identifies the Influencer `contactLinks` relation and its linked `person` records.
- Live credentials remain on the owner's Mac. Initial read-only API inspection succeeded, but subsequent Conductor Mac commands timed out waiting for the client. That initial preparation did not create or activate a workflow; the subsequent live work is recorded below.
- Hindsight access is unavailable in this VM because its private profile/repository metadata is missing. No remote memory retention is claimed.
- The initial native workflow payload and inline code were staged in the gitignored `.context/influencer-reply-workflow/` directory. Eight synthetic selector cases passed at initial publication, including retaining the reply target when many newer outgoing messages exist.

## Live Follow-Up

The Mac connection later resumed. The existing CRM session was refreshed using its established OAuth refresh helper, without copying credentials into the cloud workspace. Native workflow creation and builder mutations succeeded through that session. The workflow is [Draft Reply To Latest Influencer Email](https://crm.fundlevel.co/workflow/e7ade107-2d98-4397-8179-47053acee021).

Read-only execution of the selector on the Mac verified a real Influencer's linked contacts, most recent eligible conversation, reply Header Message ID and original mailbox. The selected conversation contained five context messages, including its incoming reply target. Customer records and message contents remain in the private Mac operation directory.

The initial three-step version passed native activation validation, but further verification found that importing `twenty-sdk` is unsupported in this inline runtime and direct `generate` calls require an application role that this caller does not have. The final definition therefore uses the native `AI_AGENT` Generate action with no tools, followed by a small email-document formatter and native `DRAFT_EMAIL`. No role grants or host changes were made.

After the Mac relay resumed, corrected core version `14f7afc7-3d2b-4812-914c-7e2b613cd913` passed native activation validation. Direct readback verifies `ACTIVE`, all four steps valid, the expected graph and an active pinned Influencer command referencing this version. The initial version was deactivated. Details and remaining provider draft verification are in the [handoff](../../handoffs/2026-11-23-influencer-reply-workflow.md).

The native inline-code testing endpoint rejects this CLI caller. Dia also rejects JavaScript automation without a launch flag; its configuration was not changed. A subsequent normal owner run completed all four steps and the native provider draft call succeeded; the draft was not independently opened in Gmail. The later guarded version and edge-case verification are recorded in decision 0002 and the handoff. No email was sent.
