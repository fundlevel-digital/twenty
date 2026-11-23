# 0002. Test Multiple Contacts And Sending Addresses

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: email-sequences
- Related: [Initial Workflow](0001-draft-replies-in-latest-influencer-thread.md)

## Exchange

- Kareem: "What are some other edge cases we can test for and handle? Like I'd like to find some places wehre there's multilpe potential infleuncer emails, and/or multiple fundlevel emails; and test that it works propely"
- Agent: investigates real linked contacts, historical message participants and accessible connected mailboxes, then exercises the selector without creating additional drafts.

## Decision And Implementation

Extend verification to multiple contact records, several historical addresses on
one contact, multiple conversations, several historical Fundlevel addresses and
shared contacts. This request authorizes workflow testing and handling defects;
it does not authorize sending emails or connecting more mailboxes.

The agent implemented conservative stops for a reply sender linked to multiple
Influencers and tied latest activity across different threads. These are agent
implementation choices in response to observed ambiguity, not a separately
approved conversation-picker design. There is no fallback to an older thread to
evade either ambiguity.

Whether to preserve other To/CC participants through Reply All remains an owner
choice. A clarification was requested; the existing sender-only behavior was
preserved. The owner subsequently skipped the clarification; no Reply-All preference was selected.

## Evidence

- Audited 479 Influencers and 563 linked People. There are 122 Influencers with
  multiple contact relations and ten contacts shared across Influencers.
- Read 3,091 participant records over 16 pages. Historical participant addresses
  supply the address-count evidence; a null contact email field was not treated
  as proof of no email history.
- Only one native mailbox is currently available for drafting to this caller.
  Historical Fundlevel participant addresses are not equivalent to connected
  mailboxes. A second native sending mailbox was tested synthetically only.
- Ten real read-only dry runs passed: eight selected their conversation and two
  formerly indistinguishable shared-contact cases stopped before generating or
  creating drafts. Eleven synthetic selector tests pass.
- Corrected version `28ccd8cf-6920-4fca-b9ea-06ec6714b5cb` passed native activation
  validation. Direct readback verifies ACTIVE and all four steps valid.
- No additional drafts or sends were performed during these edge-case tests.
  Customer evidence and candidate records remain on the Mac, not in this record.
- [Maintained Handoff](../../handoffs/2026-11-23-influencer-reply-workflow.md).
