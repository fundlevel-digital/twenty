# PlusVibe Outreach Repair — 2026-11-22

The app repair is deployed and verified after the Mac connection returned.
Targeted recovery processed all 378 matching addresses and 621 source records.
The dashboard currently confirms outreach for 337 influencers; one conflicting
Person identity remains awaiting owner clarification. The normal version-4 sync
has advanced into the lead-directory phase beyond the old failed checkpoint.

## Authorization And Scope

[Decision 0013](../decisions/packages/twenty-apps/public/plusvibe/0013-repair-source-outreach-sync.md)
records Kareem's instruction to fix the missing outreach coverage after the
[backup/export audit](2026-11-22-attio-outreach-backup-audit.md).
This work changes the PlusVibe SDK application and workspace metadata, with no
host/fork deployment, schema pruning, provider-side writes or campaign enrollment.

## Implemented And Initially Deployed

- Source Leads retain Last Sent At, Workspace Last Sent At, Latest Sent Step,
  Source Reply Count, Sequence Completed and Source Send Recorded. Full-source
  reads populate them; partial email webhooks preserve them.
- The import order is campaigns, leads, Unibox, archived Unibox. A message failure
  cannot prevent the lead-directory phase. New runs use checkpoint version 4.
- Failed checkpoints retain the failed phase and error, rather than only the
  generic failed status.
- `plusvibe-refresh-leads` refreshes up to ten exact addresses in a selected
  workspace through the provider API. It uses real source IDs and the existing
  Person matching, manual selection and ambiguity handling.
- A follow-up avoids a redundant PATCH when a new source Lead has already been
  created with its complete source fields and relations.
- `configure-source-coverage.py` adds source-lead evidence and confirmed-outreach
  calculations and updates the dashboard counters, filters, columns and notice.
  Imported email counts remain distinct from sequence step numbers.

The first non-destructive deployment plan created six fields, twelve view fields
and one function; it updated eleven entities and deleted none. Two existing raw
field labels were aligned with the source's Title Case labels. The existing apps,
legacy data and dashboard were retained. A current 2.60 CLI on the Mac used the
supported app build/plan/upload/sync path with `--no-prune`. Authentication stayed
on the Mac. Private deployment outputs and checkpoints are under the existing
private dashboard session directory there.

## Targeted Recovery And Source Reconciliation

The supplied export matched 378 distinct current POC email addresses. A resumable
operator process invokes the app refresh in batches of five, retrieving the
source records rather than manufacturing IDs from CSV rows. Multiple campaigns
can produce multiple source Leads for one email.

Recovery completed: **378 / 378 addresses**, **621 returned source records**.
Independent verification checked all 563 POCs against expected coverage derived
from the supplied export: 342 POCs should have source Leads and 341 should have
source send evidence. Three initially remained unmatched because their source
Leads were related to duplicate People rather than the influencer POCs.

For two, archived Cold Email Campaign History joined the exact original Attio
Person ID to the exact PlusVibe Lead ID. The current Influencer Contact junctions
retain those original Person IDs in sourceEvidence. Those two proven original
relations were restored through the supported REST API, with prior selections
retained privately for reversal. No People were merged or deleted. Future sync
continues respecting selected Lead Person relations.

One identity remains ambiguous: the source lead's first name differs from the
influencer POC sharing its email, source attio_person_id is blank, and no archived
lead-ID association resolves it. An asynchronous owner question asks which
Person should receive that relation. No name-based guess was made.

The latest independent verification reports **one missing expected Lead link**,
**one missing expected source-send association**, **340 confirmed POCs**,
**337 confirmed influencers** and **142 influencers without confirmation**.
These counts distinguish the unresolved identity from verified no-contact claims.
The normal directory scan is also adding unrelated workspace Leads, so the total
source Lead count is changing; 647 existed at this verification.

The dashboard now distinguishes confirmed source outreach, imported emails and
unconfirmed synced data. The old 406 count must not be presented as influencers
who have never been contacted. The sole remaining export mismatch requires the
identity clarification above.

## History Repair Deployed And Verified

The previous repair directory on the Mac preserved an earlier failed run's
specific error: `Could not update PlusVibe thread metadata`. This predates the
current failed nightly run and does not prove the same exception caused it.

Live application-context diagnostics reproduced a GraphQL schema error while
introspecting the thread update input. The source now uses the supported REST
bulk PATCH endpoint with both ID and updatedAt filters, preserving the optimistic
concurrency check and retry. It does not fall back to an unconditional overwrite.

The new administrator `plusvibe-refresh-history` function imports one Unibox page
and returns each individual failure plus its next cursor. Operator code must
retain failed page cursors/indexes and reconcile them. A page with failures is
not a complete history import.

After the Mac connection returned, the final app update succeeded: one function
created, four entities updated, zero deletions or destructive actions. A live
Unibox page processed all **30 messages with zero failures**, returning a valid
next cursor. Native totals remained 1,480 messages and 807 threads, consistent
with idempotently replaying already imported records rather than creating copies.

## Validation And Remaining Work

- All **148 app tests across 21 files** passed after the conditional REST change.
  Coverage includes source outreach facts, lead-before-history ordering, scoped
  address refreshes, concurrent thread retries and isolated history failures.
- Typecheck, lint and `git diff --check` passed. Administrator Python scripts
  parsed successfully.
- CRM health returned HTTP 200. Normal sync was restarted through the app's
  supported request-backfill function and advanced to version 4, phase leads,
  processed 76, with its next job delayed normally, zero attempts/failure and no
  recorded email failure at that check. Source lead import now precedes history.
- Full workspace history ingestion remains asynchronous and must not be reported
  complete. Missing provider sender addresses remain an explicit limitation.
- No authenticated browser interaction or screenshot is claimed.

Resolve the sole outstanding Person identity after Kareem's answer, recheck its
source Lead and dashboard counts, and continue monitoring the ordinary import.
Missing source sender addresses must remain explicit failures unless supported
by actual source evidence; do not invent senders or treat a sent step as a
lifetime email count.

## Owner Clarification — 2026-11-23

[Decision 0014](../decisions/packages/twenty-apps/public/plusvibe/0014-preserve-selected-person-and-flag-identity-review.md)
records Kareem's answer: preserve the existing selected Person and mark the
discrepancy for review. This supersedes the pending owner question above, while
the identity itself remains unresolved.

Live REST readback verified the unchanged Person relation and Needs Review flag.
A To Do review task linked to both People retains the instruction and Lead
reference. This task is the durable marker because ordinary sync recomputes the
Lead's Person Match status. Private before-state and verification evidence remain
on the owner's Mac. No app deployment or coverage recalculation was performed.

## Confirmed Duplicate Merged — 2026-11-23

Kareem subsequently confirmed the two identities were the same person and the
source name was incorrect. [Decision 0015](../decisions/packages/twenty-apps/public/plusvibe/0015-merge-confirmed-duplicate-into-existing-poc.md)
supersedes 0014. The live merge retained the existing influencer POC's record,
name and both addresses, transferred the one related PlusVibe Lead, restored its
Matched status and completed the review task. Readback verified the duplicate
is no longer active and the task relation is consolidated onto the survivor.
The POC now has one source-send Lead and confirmed outreach. Workspace-wide
coverage totals were not recalculated.

The regular native merge endpoint failed and rolled back because its payload
attempted to write calculated outreach fields as stored columns. A separate
authenticated maintenance process ran the same native merge transaction with
computed fields excluded, after a successful preview. No deployed source, schema
or services changed. A general fix for merging records with computed fields is
still outstanding. Private execution evidence remains on the owner's Mac.
