# Influencer Reply Workflow — 2026-11-23

The workspace workflow selects an Influencer's latest active eligible email
conversation and drafts a reply to their latest incoming email in that thread.
It is manually launched on an Influencer record and replies only to the sender.
Sending and sequence scheduling are outside this implementation.

## Source And Live Configuration

Maintained source, the native workflow template, payload builder and selector
tests live in [the operations workflow directory](../../packages/twenty-docker/operations/workflows/influencer-reply/README.md).
The JSON builder embeds the code steps without deployment or CRM access. Native
AI Generate and Draft Email supply the remaining actions; no new application,
role grant, browser setting or host modification was introduced.

The live workflow is
[Draft Reply To Latest Influencer Email](https://crm.fundlevel.co/workflow/e7ade107-2d98-4397-8179-47053acee021).
On 2026-11-23, core version `28ccd8cf-6920-4fca-b9ea-06ec6714b5cb` passed native
activation validation. Direct readback verified ACTIVE, all four steps valid,
and an active pinned Influencer record command pointing to that version.
The graph is selector → native AI Generate → email document formatter → Draft
Email. Earlier versions were superseded. Merging this repository source does not
install, activate or update a workflow in any CRM.

## Behavior And Limits

The selector paginates the selected Influencer's linked People and their message
history, excludes drafts and channels that are not connected email mailboxes,
then chooses the most recently active eligible thread. It replies to the latest
incoming linked-contact email within it, even when newer outgoing messages exist.
The original connected mailbox comes from the message's channel association;
the recipient comes from the actual incoming sender's address. The incoming
Header Message ID supplies the native reply threading context.

It stops before generation on missing history, a missing reply header, ambiguous
mailbox ownership, tied latest dates across threads or a sender shared across
multiple Influencers. It does not choose an older conversation to evade those
conditions. Shared-contact attribution needs manual review; no conversation
picker is implemented. The AI gets quoted context and no data tools, and uses
placeholders for unknown facts. The formatter refuses an empty response.

The reply contains no copied participants. The owner skipped the Reply-All
clarification, so the existing sender-only behavior remains the default; this
is not approval for Reply All. Reply-To, automated senders, aliases, concurrent
runs and duplicate draft prevention remain unimplemented. Repeated runs can
create additional drafts. Only one native mailbox was available to the caller,
so live selection between two connected sending accounts remains unverified.

## Verification

- Eleven synthetic selector cases pass, covering multiple contacts and incoming
  addresses, mailbox ownership versus a copied address, ambiguous mailboxes,
  missing history/headers, tied dates, drafts, unavailable mailboxes and context
  retention of an older incoming reply target.
- A normal owner run (`43ae145b-b7ae-45e8-ae10-bbd116733c91`) completed all four
  steps. The native Google draft call succeeded with a nonempty reply and the
  selected parent's header. The draft was not independently opened in Gmail.
  A prior run without a selected Influencer correctly stopped at the selector.
- A read-only audit covered 479 Influencers, 563 linked People and 3,091
  participant records. Ten real selector dry runs verified eight selected
  conversations and two shared-contact cases that stopped before drafting.
  No additional drafts or sends were made by those edge-case tests.
- No email was sent during this work. Customer evidence and candidate records
  remain in the private Mac operation directory, not in this repository.

## Operating Notes

Production authentication remains on the owner's Mac in the existing Twenty CLI
configuration, with the established private refresh helper. Private verification
artifacts are under `~/.twenty/influencer-reply-workflow/`. The native inline-code
test endpoint rejected the CLI caller, and Dia rejected JavaScript automation
without a launch flag; neither restriction was bypassed.

Use native builder APIs or the signed-in workflow editor to edit a new draft
from the active workflow. Compute native output schemas and validate before
activation. Use `coreWorkflowVersionById` for fresh readback: the list endpoint
returned stale trigger/step content after successful writes. When inserting an
AI step before an existing formatter, pass that formatter as `nextStepId`;
omitting it creates a separate branch.

Inline code cannot import build-time-only `twenty-sdk` from the runtime package
layer. Direct `generate` calls also required an application role absent from the
caller. The native AI workflow action avoids both requirements and retains the
workspace default model and no-tools configuration.

Owner requirements and exchanges are recorded in
[decision 0001](../decisions/email-sequences/0001-draft-replies-in-latest-influencer-thread.md)
and [decision 0002](../decisions/email-sequences/0002-test-multiple-contacts-and-sending-addresses.md).
Hindsight was unavailable because private profile/repository metadata was missing;
no remote retention is claimed.
