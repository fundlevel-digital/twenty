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


## 2026-11-24 Live Repair Resumed

Owner continuation: [0018](../decisions/packages/twenty-apps/public/plusvibe/0018-resume-and-verify-live-sync-repair.md).
The Mac command bridge and maintenance SSH connection work again. The Mac still
had the old channel-table guard because the earlier delivery had timed out. The
operator now validates destinations against `core.messageChannel` and the explicit
workspace ID. Python compilation and a rollback-only preflight passed for all
1,480 rows. The maintenance transaction then committed all 1,480 associations.
A separate database readback verified channel, external identity and direction
against the prepared plan for every original row.

At 00:25 UTC, independent database and API inventories both verified:

- 15,814 exported leads; 15,825 CRM leads; zero missing exported IDs.
- All 7,241 previously selected Person links unchanged.
- 1,842 native messages: all 1,480 originals plus all 362 missing source identities.
- Zero changed original message subjects, text, received timestamps or thread links.
- 111 owned Sender records, zero unverified Sender records, zero identical From/To handles.
- 17 preserved messages with unresolved owned-inbox attribution.

The old five-message import batches were reconciled against actual associations
and marked complete, with the previous checkpoint retained privately. Replaying
those completed imports is unnecessary. Forty cached reply flags across 870
conversations disagreed with corrected incoming associations; the API repaired
those flags after preserving a private before snapshot.

History resumed at 00:25:57 UTC under a new guarded import run. The campaign
scheduler `queue-history-recovery.py` checkpoints `history-recovery-queue.json`
and schedules 10,199 distinct source lead addresses with three-second pacing.
Both files remain in the private Mac recovery directory. Scheduling completion
must not be described as history import completion.

A campaign job exposed `messageParticipants.some is not a function` in
`findCampaignSender`. A live API query confirmed the relation needs explicit
`edges { node { handle } }` selection. The handler and regression fixture now use
that connection shape, preserving exact recipient matching and ambiguous-sender
safeguards. All 168 app tests, direct TypeScript and changed-file lint pass.
The app-only fix deployed successfully with `--no-prune`; its plan/apply reported
three function checksum updates and zero creates, deletes or destructive actions.
Host source was not deployed. Campaign jobs that failed before this deployment
still require replay and verification; the whole history recovery is not yet
verified complete.


### Campaign Recovery And Rate Limits

The exact reproduced sender-lookup failure succeeds after deployment and imports
four source messages. All 10,199 campaign lead-history jobs were scheduled in 102
batches. A bounded BullMQ operator selected 77 current-workspace/current-run jobs
that began before deployment (including one still active) and queued distinct,
paced replays. It retained their payloads/options privately, reset application
retry counters, guarded the selection at 200 jobs, and delayed active-job replays
until the original execution window expired.

At 00:35 UTC the live count had grown to 2,024 messages, 15,825 leads and 115
Sender records. The 193 unresolved inbox messages at that point are preserved;
these later counts are ongoing imports, not the earlier completed integrity
snapshot. Account authentication and native mail connectivity were healthy.
The main history page nevertheless exhausted retries on Twenty REST HTTP 429.
The app's native-email retries already back off, but concurrent campaign work
still exceeded the application's request budget.

A workspace/run-scoped BullMQ pacing operator moved 10,011 remaining delayed
campaign jobs to fifteen-second spacing with a one-minute cooldown, prioritizing
the bounded replays. Other applications/workspaces were excluded. This is about
42 hours of scheduled lead lookups before accounting for execution and additional
pagination; it is intentionally not a completion estimate. The scheduling Mac
coordinator has finished; the delayed jobs now live on the server.

The app now exposes administration-only `retry-history-page`, guarded by selected
workspace, expected run ID and failed email/archive phase. It preserves cursor,
processed count and run ID, so existing campaign jobs remain valid. A distinct
short delivery ID avoids retained completed IDs and the 128-character SDK limit.
If enqueue fails, the old failed checkpoint is restored. Regression tests cover
run/cursor preservation, superseded runs, wrong phases, scheduling failure and the
actual enqueue payload/short ID. All 174 tests across 23 files, direct TypeScript
and changed-file Oxlint pass. The final app-only plan/apply reports six function
checksum updates, zero creates/deletes/destructive actions.

The first retry attempt updated the checkpoint but its long delivery ID could not
be queued. After correcting the ID and rollback safeguard, a one-time guarded
BullMQ delivery restored that missing page job from its existing payload, checking
that no same-run page was active. Its ID ends in `plusvibe-retry-20261124`.
The canonical job shown by the settings screen may still show the earlier
completed delivery until this page advances. Inspect the actual retry delivery
and checkpoint before issuing another retry. No complete-history claim is made.

Private evidence remains under `/tmp/twenty-plusvibe-sync-fix/recovery/`:
`database-integrity-verification-2026-11-24.json`,
`thread-reply-flags-before-2026-11-24.json`, `history-recovery-queue.json`,
`history-pacing-2026-11-24.json`, `pre-fix-history-replay-scheduled.json`,
`latest-fixed-history-replay-2026-11-24.json`,
`native-history-page-requeued-2026-11-24.json`, and
`history-status-2026-11-24.json`. The original recovery snapshots/checkpoints and
before-script copies remain private on the Mac. Inspect live job outcomes and
reconcile outstanding failure markers after the paced jobs run; do not infer
success from BullMQ's completed state alone because permanent app errors can be
returned as completed platform deliveries.


### 00:48 UTC Recovery Handoff

The exact fixed campaign replay returned `SUCCESS` and imported four messages.
At 00:44 UTC, native messages reached 2,149 with 309 unresolved inbox attributions
and 115 Sender records. The four additional Sender addresses were independently
matched to explicit `eaccount` fields in the original private provider export;
they are historical accounts absent from the current directory. Their verified
evidence was added to the private verifier registry after retaining its old copy.

Sixty-eight current-run campaign jobs were already waiting/prioritized rather
than delayed and therefore escaped the initial pacing pass. A bounded operator
moved those jobs to delays, skipping active jobs. A final pass merged all 10,043
remaining delayed campaign jobs into a single fifteen-second schedule, so the two
pacing schedules do not overlap. Its aggregate checkpoint is
`final-history-pacing-2026-11-24.json`; the selected waiting-job before data remains
in `waiting-history-pacing-2026-11-24.json` on the Mac. The native history page
retry is now independently confirmed **active**. The campaign coordinator is
finished; queued server jobs do not depend on the Mac staying awake.

The final deployed retry fix uses short IDs within the SDK's 128-character limit
and restores the failed checkpoint on enqueue failure. All 174 tests, direct
TypeScript and changed-file lint pass; the final app plan/apply again had zero
metadata deletions/destructive actions. Source changes and this handoff are local
workspace changes; no new PR or main merge has been performed in this continuation.

Full history completion, exhausted campaign-job retries and final unresolved
inbox attribution still need reconciliation after the long-running jobs execute.
A recorded `emailFailures` marker was still present before the final pacing pass.
Do not claim those errors cleared merely because the replacement page is active.


## Durable Pipeline Continuation

The [2026-11-24 durable sync handoff](2026-11-24-plusvibe-durable-sync.md)
records the subsequent app-only deployment, preservation finding and current
execution blocker. A fresh inventory proved 304 old texts were rewritten by the
old replay extractor after the earlier zero-difference checks. The guard is
fixed in the applied durable bundle; exact snapshot restoration remains pending
Mac reconnection. Earlier preserved-count snapshots are historical evidence,
not proof that the later replay left all original text unchanged.
