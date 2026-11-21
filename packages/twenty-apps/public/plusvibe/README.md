# PlusVibe for Twenty

Sync selected PlusVibe workspaces into native Twenty Messages and Message
Threads. Imported conversations appear on their People records. Dedicated
workspace and campaign records provide source context and normal Twenty filters.
Requires Twenty 2.60+, a PlusVibe account API key, and public HTTPS server routes.
The app icon was supplied by the workspace owner.

The [decision history](../../../../docs/decisions/packages/twenty-apps/public/plusvibe/DECISIONS.md)
preserves the owner requests, corrections, rationale and preview/deployment boundary.

## Set up

```sh
yarn install
yarn twenty auth login --url https://your-twenty.example.com --name your-workspace
yarn twenty app apply --create --no-prune --remote your-workspace
```

Open **Apps preferences → PlusVibe → Sync**, connect an account, then choose
workspaces and enable sync:

1. **Connect PlusVibe.** Twenty's native connection form accepts the PlusVibe API
   key and stores it encrypted. It validates the key, creates the messaging
   connection, and returns to setup. No PlusVibe OAuth redirect or app-variable
   key entry is involved.
2. **Choose workspaces.** Choose a connection to manage its workspace selection.
   No workspace is selected automatically. Use **Add connection** for another key.
3. **Enable sync.** This saves the selection, registers webhooks, and queues the
   initial import. Campaign outreach is fully shared. Unibox messages and replies
   use the connection owner’s sharing preference.

Change the selection with **Save changes**, refresh history with **Import again**,
or use **Stop syncing** to keep existing records while stopping future imports.
Each member manages their own API keys. Every connection has an encrypted
credential, workspace selection, and import/sharing preferences. Other members
cannot change those preferences, selections, or imports. Adding a connection leaves other connections syncing.
**Manage connection** opens Twenty's native detail page for replacement/removal.
Stop that connection's sync before replacing its key. Reconnecting an existing
native account updates that connection instead of adding a duplicate.

Requests, webhook checks, and native email channels resolve the key assigned to
the source workspace. A workspace can sync through one connection at a time;
stop its current selection before assigning it to another key. A revoked or
removed key never sends that workspace's requests through an unrelated key.
Existing workspace, campaign, lead, and message identities remain stable.
A daily refresh also runs at 03:00 UTC.

New connections use a user-scoped provider. The earlier workspace-scoped API-key
provider remains declared because Twenty cannot change an existing provider’s
scope. Its existing connections still resolve by their assigned source workspace.
The runtime retains saved-variable fallback for legacy jobs; a global key is not
presented as a member’s personal connection.

## Import and sharing preferences

- **People Auto-Creation:** Sent and Received, Sent, or None, matching native
  email creation policies. Only qualifying email activity creates People;
  importing the lead directory or a bounce/label event alone does not. Existing
  People still match regardless of policy. Legacy on maps to Sent and Received;
  legacy off maps to None.
- **Internal Employees:** exclude coworkers on your workspace members’ and source
  senders’ business domains by default. Workspace members and sending addresses
  themselves are always excluded from creation. Personal email provider domains
  are never inferred as a shared employer. Additional internal domains are editable
  per connection; domain matching includes subdomains and rejects lookalike names.
  Existing employee People still match; no People are deleted by changing policy.
- **Unibox sharing:** Participants and dates only (`METADATA`, the default), Share
  subject (`SUBJECT`), or Share everything (`SHARE_EVERYTHING`). The connection
  owner keeps full access. Changes save immediately and update that owner’s existing Unibox channels.
- Campaign-sent history and campaign send webhooks use fully shared outreach
  channels. Unibox history, manual sends, and replies use separate native channels
  governed by the preference, including replies associated with a campaign.

Preferences use native Twenty account cards, creation/sharing choices, and
employee exclusion controls. Domain changes use Save Domains; other preferences
save immediately.
Temporary route failures retry once; if loading still fails, the page offers Retry
without showing default preferences or a false disconnected account.

## Upgrade boundary

This schema change is verified in an isolated VM preview, not production.
Replacing old text labels/IDs and single-thread relations requires `--prune`;
copy label values and populate the replacement relations before removing old
fields on an existing installation. Existing mixed legacy mail channels are
conservatively restricted to the Unibox preference. Before a production history
reimport, migrate their message associations into the new outreach/Unibox channels
while preserving message identities; otherwise channel-scoped ingestion can
create copies of old messages. Keep the original snapshot until that migration
is verified. The preview was reseeded from its approved snapshot.

## Records and filters

- **People:** new contacts allowed by the creation policy and employee exclusions receive
  names, primary email, and job title. Existing
  contacts match by primary or additional email, case-insensitively, and retain
  their fields. Matches are verified against the full address. Ambiguous matches
  keep the source Lead as Needs Review and do not create another Person. A
  selected Lead Person takes precedence over the previous source lead mapping;
  existing mappings keep alternate-address replies linked to the same Person.
- **PlusVibe Leads:** workspace-scoped source lead ID, name, email, Status select,
  raw status, Lead Label select, Person Match, and Last Synced At. Each lead has a
  many-to-one Person relation; People expose the inverse PlusVibe Leads list.
  Leads also relate to their Workspace and Campaign. Partial email events do not
  overwrite a fully imported lead profile.
- **PlusVibe workspaces:** source workspace ID, name, and whether sync is selected.
- **PlusVibe campaigns:** source campaign ID, name, Status select, and Workspace
  relation. Status choices are Draft, Active, Paused, Completed, Archived, and
  Other. The original provider value remains in Status (Raw).
- **PlusVibe Senders:** source sending addresses with Workspace relations and
  many-to-many links to Leads, source Threads, and native conversations.
- **PlusVibe Threads:** source thread identities scoped to each Workspace.
  Many-to-many links connect Leads, Senders, and native Message Threads.
- **Messages:** native email records with participants, workspace/campaign/sender
  relations, and a PlusVibe Thread relation usable in Twenty’s Group by menu.
  Redundant raw workspace, campaign, and thread ID fields are removed. Canonical
  source IDs remain on their own source objects for sync identity.
- **Message Threads:** native conversations with workspace/campaign relations,
  reply classifications, and many-to-many Lead/Sender/source Thread links.

Twenty supports one-to-many and many-to-one fields. Dedicated link objects model
many-to-many associations; lookup columns traverse them to display related names.
All source and link objects stay in the PlusVibe sidebar folder.

- **PlusVibe events:** the earlier activity object now holds bounce and label
  events. Email bodies are stored as native Messages, not activity copies.

The **PlusVibe Emails** and **PlusVibe Conversations** navigation items open
native tables with Twenty's normal filters. Conversations include saved views
for **Replied**, **Interested**, and **Not interested**. Combine these with sender,
workspace, campaign, or thread ID filters. Reply labels preserve the known
Interested / Not interested / Unsubscribed / Out of office classifications seen
on a conversation, even after a later send. Latest reply label preserves the
provider's current label string, including custom labels; unrecognized history
labels are categorized as Other.

## Import and live updates

Campaigns, Unibox messages, archived messages, and leads import in checkpointed
pages, in that order. Conversations appear before the full lead directory has
been scanned. Each lead queues an import of its campaign-sent email history.
History jobs are spaced out, and background requests back off on provider rate
limits. Bodies are converted to plain text and quoted reply history is removed for
Twenty’s native email renderer. Signatures and quote-only forwards are preserved. Imported bodies are capped at Twenty's 262,144-character ingestion
limit so a very large email does not stop the history import. The full original
remains in PlusVibe. Attachments are not imported yet.

When PlusVibe leaves sender or lead fields blank, Unibox participants are
recovered from the email headers. Campaign history without a sender uses an
existing conversation only when the same workspace, campaign, and lead email have
one unambiguous sender. Missing or ambiguous sender history is reported as a
failed email job rather than assigned an invented address.

New sends and replies arrive through signed webhooks. HMAC-SHA256 is checked
against the exact raw body before any message writes. Selected workspace and
registration identity are also checked. The native ingestion API handles message
deduplication, participants, thread targets on People, and message visibility.
Each sending address has separate outreach and Unibox channels, while message and thread
identities are scoped to their PlusVibe workspace. Where PlusVibe
omits a thread ID on campaign sends, the connector groups by workspace, sender,
lead, and campaign; a later source thread ID can bind to that conversation.
Missing source IDs are left blank rather than presented as real PlusVibe IDs.

Thread updates preserve reply history and use an optimistic update to avoid
losing classifications during concurrent deliveries. Live label events also
update matching native threads. Existing webhooks retain the label subscriptions
present when they were created; new PlusVibe label definitions require updating
the source webhook subscription.

Transient failures use Twenty's `RetryableLogicFunctionError` protocol; a plain
Error alone does not make its queue retry. Permanent discovery failures are
marked Failed. Campaign-email job failures are exposed in Apps preferences. Discovery
can finish while individual email-history jobs are still running, so Apps preferences
say so. Execution logs provide per-job details. Both current paginated API
responses and legacy array pages are supported. Legacy lists continue using the
last record ID until an empty page, with repeated cursors rejected.

**Stop syncing** clears the selected connection’s workspace selection. Queued jobs and deliveries check it before
processing, and existing CRM records remain. Provider webhooks are retained for
reuse. The importer does not send mail or change campaigns or leads in PlusVibe;
reply sending from Twenty is not enabled by this messaging provider.

## Development

```sh
yarn typecheck
yarn test
yarn lint
yarn twenty app build
```

Definition files use the direct default exports required by Twenty's loader;
components, handlers, and utilities use named exports. SDK and UI packages are
pinned to 2.60.0. CLI 2.59.0 was retained because 2.60.0 was inside the repository's
dependency age gate during setup.

Protocol references: [workspaces](https://developer.plusvibe.ai/get-workspaces-38494472e0),
[campaign sends](https://developer.plusvibe.ai/get-campaign-emails-38494482e0),
[Unibox messages](https://developer.plusvibe.ai/get-emails-38494515e0),
[webhooks](https://developer.plusvibe.ai/webhooks-overview-2268181m0).

An application manager can execute `plusvibe-sync-health` with a selected
`workspaceId` to check source pagination, email mapping, and native message/thread
counts without returning contact records or email content. Preferences status also
includes failed discovery and email-history queue jobs for troubleshooting.

Reply parsing pins the CommonJS 2.2.1 parser: newer ESM releases initialize
`createRequire(import.meta.url)` while Twenty extracts manifests as CommonJS.

The app role reads Workspace Members only to check employee email addresses; it
cannot create or update member records. Failed employee lookups stop creation.
