# Influencer Reply Workflow

Select an Influencer and run **Draft Reply To Latest Influencer Email** to find
the latest active eligible conversation across its linked People, generate a
reply to their latest incoming email, and save a draft in the original connected
mailbox. The workflow replies only to that sender and leaves CC empty.

The native workflow uses four steps: a thread selector, a native AI Generate
action with no tools, an email document formatter, and Draft Email. There is no
Send Email action, schedule, new application or host modification. The code steps
use the caller's injected runtime authentication; no credentials are embedded.
The AI action uses the workspace default model and marks unknown facts with
placeholders for the owner to complete.

## Build And Verify

Requires Python 3 and Node.js 22.18 or newer with TypeScript stripping enabled.

```bash
python3 packages/twenty-docker/operations/workflows/influencer-reply/build-workflow.py > /tmp/influencer-reply-workflow.json
node --test packages/twenty-docker/operations/workflows/influencer-reply/select-reply.test.mjs
```

The generated JSON is an argument payload for Twenty's native
`create_complete_workflow` tool, not a browser import file. It defaults to
`activate: false`. Inline TypeScript is assembled from the maintained source
files because the workflow runtime cannot load their relative imports. The
build command only writes JSON to stdout; it does not access a CRM or deploy.

The workspace needs `influencer.contactLinks.personId` and
`influencerContacts.personId/influencerId` relations, standard message objects,
a connected email mailbox, native inline Code/AI Generate/Draft Email actions
and a configured AI model. Configure native output schemas and validate before
activating in another workspace. For updates, create a new draft of the existing
workflow rather than installing a duplicate.

## Selection And Limits

The selector excludes drafts and channels that are not connected email
mailboxes. It uses message dates to select a thread, then finds the latest
incoming email from a linked contact within that thread, even when newer
outgoing messages exist. It uses the incoming sender's actual address and the
mailbox's channel association, not the first contact address or a copied
Fundlevel address. It retains up to 12 context messages, including the reply
target, with at most 12,000 characters per message.

The workflow stops before generation when there is no eligible history or
incoming reply target, the header identifier is missing, mailbox ownership is
ambiguous, two threads tie for latest activity, or the incoming sender's contact
is linked to several Influencers. Shared-contact cases need manual attribution;
this workflow does not provide a conversation picker. It does not fall back to
an older thread to evade ambiguity. Large participant/association lists stop
rather than silently truncate selection inputs.

Historical sender addresses are not proof that those mailboxes are connected.
Only one native sending mailbox was available during live verification;
multiple connected mailboxes were exercised synthetically. Reply-All, Reply-To,
automated senders, mailbox aliases and duplicate draft prevention are not
implemented. Running the workflow repeatedly can create additional drafts.

See the [handoff](../../../../../docs/handoffs/2026-11-23-influencer-reply-workflow.md)
for the live configuration, verification and remaining limitations. Customer
records and private authentication helpers are excluded from this directory.
