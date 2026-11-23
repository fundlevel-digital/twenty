# PlusVibe Sync Repair — 2026-11-23

Owner authorization: [0017](../decisions/packages/twenty-apps/public/plusvibe/0017-complete-the-live-sync-repair.md).
This continues the [diagnostic snapshot](2026-11-23-plusvibe-sync-diagnosis.md).

## Verified Lead Recovery

The complete provider directory export contains 15,814 leads across 159 pages.
The repair created 8,576 source records and updated 7,238 existing source records,
with no failed writes. Independent live verification counted 15,823 CRM leads,
including every exported provider ID. Historical extras were retained.
7,241 existing non-null Person relations were independently checked unchanged.

Private source exports, before snapshots, resumable checkpoints and exact HTTP
errors remain on the owner's Mac under the private recovery directory. Customer
records and credentials are not copied into repository documentation.

## App Changes Deployed

The PlusVibe app alone was deployed with `--no-prune`. Planning reported no
metadata deletions. No Twenty host source change was deployed.

- Sender ownership requires explicit provider account evidence, a registered
  historical inbox, or the provider's connected account directory. Generic
  `sender_email` and arbitrary incoming From addresses do not establish ownership.
- Missing inbox attribution preserves the message in an unresolved historical
  inbox and leaves its PlusVibe Sender relation empty.
- The Message field Inbox Resolution distinguishes Verified and Unresolved.
- Historical source flags can contradict headers. Known organization ownership
  corrects an incoming row with our From address into an outgoing message.
- Source `id`/`_id` precedes RFC `message_id`: the export contains 114 reused RFC
  IDs across distinct provider records.
- Replays find their existing native channel, preserving privacy and avoiding
  duplicates across campaign-history and Unibox imports.
- A bounded administration-only repair function supports export, repair, guarded
  history resumption and paced history job scheduling for selected workspaces.

## Native Data Repair

The before snapshot contains 1,480 messages. One-to-one reconciliation assigns
1,473 to provider records; seven unmatched messages are retained. The repair does
not replace message IDs, contents, timestamps or existing thread relations.

The ownership plan retains or creates 111 organization-side sender records and
soft-deletes 49 incorrectly classified records and their obsolete junctions.
1,471 existing messages have evidenced inboxes; nine remain unresolved. Those
counts describe the existing-message plan, before the missing-source import.

Native message-channel associations are not writable through the public API.
A maintenance transaction validates the workspace, existing association/message
pairs and destination channels before updating all 1,480 associations atomically.
A failed guard rolls the transaction back. Other record repairs use resumable
API upserts and reversible soft deletion with private before snapshots.

## Verification And Remaining Work

The app's 168 tests across 22 files pass. Direct `tsgo --noEmit` and changed-file
Oxlint pass. Lead writes and preserved Person relations are verified live.

Independent live verification after API repairs confirmed:

- 15,814 exported source leads; 15,823 CRM leads; zero missing source IDs.
- Zero changed previously selected Person relations.
- All 1,480 original message IDs retained, with zero changes to contents,
  subjects, timestamps or existing native thread relations.
- 111 Sender records, with zero addresses outside the ownership registry.
- Zero messages whose From and To handles are identical.
- Nine original messages with unresolved owned inboxes.

The API-supported participant, message metadata, sender and junction repairs are
complete. The remaining association transaction has **not run**: the owner's Mac
SSH agent refused signing, then reported communication failures. A host read
succeeded before the signing failures; no database transaction committed.
Corrected header IDs are already written, but native associations still require
the prepared maintenance transaction. Keep replay of existing history paused
until it completes; do not report the full sync as restored.

A separate resumable import is recovering 362 source message IDs proven absent
from all original associations. It does not depend on the blocked link migration.
The initial parallel importer acknowledged 60 messages, then encountered Twenty
REST HTTP 429 responses; a fresh live count showed 1,548 native messages. The
failed parallel importer ended. The app now retries typed native REST 429 errors
with bounded backoff (five waits, maximum 60 seconds each). This is deployed and
covered by retry-success and retry-exhaustion tests. A replacement single-message
paced coordinator inventories actual association IDs before replay and records
progress per source identity, so partially successful old batches are reconciled.
Full missing-message import completion is not yet verified.

Recovery operators remain on the owner's Mac under
`/tmp/twenty-plusvibe-sync-fix/`: `message-recovery.py` (API checkpoints),
`association-recovery.py` (guarded transaction), `pending-paced.py` (current
missing-message coordinator), `verify-current.py` (integrity checks), and `finish-recovery.py`
(post-migration verification and history scheduling). Before resuming, inspect
private checkpoints under its `recovery/` directory and confirm no duplicate
coordinator is running. The transaction runner retries only when explicitly
launched; it is not a recurring SSH prompt loop. After the existing maintenance
key is unlocked, rerun the prepared association operator. The original waiting finish coordinator was stopped to prevent overlapping
replays. Wait for the paced coordinator to finish, inspect
`pending-message-record-progress.json`, and reconcile its completed source IDs
with the old five-message batch checkpoint before restarting the finish runner.
Do not run two pending-message coordinators concurrently.

The full Unibox export contained 1,835 unique provider record IDs across current
and archived responses. Seven unmatched original messages are retained in addition
to those source identities. Campaign-sent history still needs paced recovery;
no campaign-history queue completion is claimed. Queued history is not proof of
imported history. Preserve the current import checkpoint until migration and
verification allow the guarded history-resume operation. Recompute cached thread
reply flags from corrected native directions after migration and missing-message
import; do not retain false reply flags caused by mislabeled outgoing source rows.

The original failed lead-page HTTP 400 was not reproduced: the same ten-source
page now imports without failures. Its original detailed response was not retained,
so the specific old HTTP 400 cause remains unproven.

## 19:20 UTC Maintenance Retry

Kareem said "try now". Both the maintenance request and an independent private
checkpoint read returned Conductor's "Timed out waiting for client". This retry
could not establish current SSH or database transaction status. Reconnect the
owner's Mac Conductor client before retrying, then inspect private transaction
results and running coordinators rather than assuming either commit or rollback.

The prepared association transaction's destination-channel guard was corrected
to read `core.messageChannel` with an explicit workspace ID, matching the deployed
entity's schema. The corrected operator passes Python compilation in the cloud;
delivery to the Mac and transaction execution remain unverified because the
client bridge is not responding. The SQL retains the all-1,480-rows guard and
single transaction. No further app deployment occurred during this retry.

## Main Integration For PR 39

Merged `origin/main` at `786932d149` into the outreach branch. Resolved four
conflicts by retaining both documentation sets and both PlusVibe sync imports.
Main's native enum normalization remains alongside source outreach evidence,
owned-inbox checks, provider identity handling and rate-limit recovery. The
branch-local grilling decision moved from 0009 to 0013 to preserve main's
existing dashboard-save record; its decision and owner quote are unchanged.

Verification after reconciliation: 168 PlusVibe tests across 22 files, direct
TypeScript check, source Oxlint, preview production build, Python helper
compilation and diff whitespace checks passed. This integration does not perform
a deployment or change the outstanding live-history repair status above.

Main advanced to `c04a803857` during the push. Integrated that reply-workflow
commit too, preserving both added documentation indexes; PlusVibe implementation
was unchanged by this second merge.
