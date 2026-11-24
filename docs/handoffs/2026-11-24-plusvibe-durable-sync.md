# PlusVibe Durable Sync — 2026-11-24

Owner authorization: [0020](../decisions/packages/twenty-apps/public/plusvibe/0020-harden-and-deploy-normal-sync-recovery.md).
Continues the [data repair](2026-11-23-plusvibe-sync-repair.md). The original
lead-write HTTP 400 was never reproduced with its original response diagnostic;
this work prevents a rejected source record from stopping the rest of discovery
and retains structured diagnostics if a rejection recurs.

## Implemented Behavior

- A native app-owned Sync Job object persists work, attempt counts, retry dates,
  completion receipts and sanitized diagnostics. Two compound indexes support
  ready-job selection and workspace/run coverage counts.
- Payloads stay in private application KV, which is persisted in PostgreSQL.
  The job object exposes metadata without message bodies or prospect addresses.
  Acknowledged completed tasks release their private inputs.
- One global application worker owns a conditional-update lease. Competing
  workers cannot both claim the same `updatedAt` revision. Expiration exceeds
  the function execution ceiling; an old owner cannot release a successor's
  lease. Every minute, cron checks saved work independently of old queue status.
- REST and Core client calls share pacing within the exclusive worker. HTTP
  429/5xx, transport timeouts and execution-budget yields preserve inputs and
  reschedule work. A global cooldown honors Retry-After; throttling never becomes
  permanent merely because a delivery spent its original finite retry budget.
- Provider pages persist record tasks before cursor advancement. Workers ingest
  individual records rather than whole pages. A bad source record is isolated
  as Failed while discovery and unrelated records continue. Repeated pagination
  cursors are rejected instead of silently looping or truncating.
- Old backfill/campaign handlers enqueue durable work. Signed webhooks persist
  verified input before acknowledgment and use the same worker. Failure to
  publish an immediate wake does not discard a saved task; cron can recover it.
- Every lead, campaign and message receipt is read back and checked against its
  provider identity before completion. Source discovery completion alone is
  insufficient for a Sync Complete label.
- Settings show lead coverage, email source imports checked, pending and failed
  work, separate webhook failures, stale-worker warnings and periodic status
  refreshes. A manual retry resumes failed saved work at its existing run/cursor.

Email coverage counts source observations (current Unibox, archived Unibox and
campaign history), which can overlap. They are not a distinct native Message
count. Native message identities remain provider-ID based and replay-safe.
Unresolved owned-inbox attribution remains explicit rather than fabricated.

## Verification And Deployment

Source implementation is complete; live restoration and reconciliation are in
progress. No complete-history claim is made. The durable app plan/apply succeeded: 83 creates, 19 updates, zero
metadata deletions or destructive actions. Source deployment uses the complete
current app source; the old Mac staging directory lacked helpers already on main.
The initial Select protocol-value validation failure was corrected before apply;
its dependent default-view errors disappeared with that correction.

Private exports, deployment plans/results, before snapshots and job migration
checkpoints remain under `/tmp/twenty-plusvibe-sync-fix/` on the owner's Mac.
Credentials, raw customer rows and message bodies are excluded from this handoff.


## Live Preservation Finding And Restoration

A fresh pre-deployment API inventory found 2,376 native messages and preserved all
15,814 exported lead IDs and 7,241 selected Person links. All 1,480 original
message IDs, subjects, timestamps and thread links remained, but 304 original
message texts had changed. A private comparison with the actual parser proved
all 304 changes equal `extractEmailReply(originalText)` exactly. The old verified
message path explicitly patched text on every replay, violating the preservation
requirement despite retaining message identity. This defect is now fixed: replay
reads the existing message and returns its native IDs, bypasses ingestion, and
never patches its text/subject/time/thread. Both verified and unresolved paths
use that guard. Native identity verification uses the standard association's
workspace-prefixed provider ID rather than relying on retained legacy fields.

The old recovery run was paused with private payload backups: 9,871 delayed jobs
were moved one day out. After intermittent Mac bridge timeouts, connectivity
returned. The idle guard passed before restoration began. The final idle snapshot
found **528** changed original texts, all matching the same proven extraction
transformation. Restoration is running with current-text compare-and-set guards;
completion and independent verification are still pending at this checkpoint.

The final candidate applied successfully with nine updates, zero creates/deletes.
A follow-up diagnostic refinement applied 16 function updates, again without
pruning: provider HTTP 400/401 errors retain their typed HTTP status and
allowlisted rejected parameter names, and known invariant failures retain stable
reason codes. Raw provider error bodies remain private. This closes a diagnostic
gap observed when an old-run discovery task retained only a generic Error.

All 9,871 postponed legacy jobs were backed up again and removed after verifying
none were active. This prevents their delayed delivery from flooding the repaired
app. A manager-guarded full version-5 import started at 02:13 UTC with run ID
`d4388ea2-38fc-4a57-97d7-f28af5b3b316`. The earlier version-5 checkpoint was a
partial migration; its provenance is not evidence of complete discovery.

The guarded restoration operator is maintained at
[`restore-original-message-text.py`](../../packages/twenty-apps/public/plusvibe/scripts/restore-original-message-text.py).
Four standalone tests verify exact restoration/readback, rejection of unrelated
content changes, preservation of concurrent edits, and refusal to restore when
other original fields changed. Dry-run/apply requires the private original
snapshots, deployed guard and a read-only check that old replay executions are
idle. It writes only the proven transformation using native GraphQL updates
conditioned on the current text and original ID/source; it never upserts records.

## Candidate Verification And Remaining Execution

- 210 app tests across 28 files pass, including concurrent lease acquisition,
  expired-lease recovery, retained checkpoints after failed publication,
  indefinite rate-limit recovery, rejection isolation, source identity readback,
  private payload handling and settings completion/failure behavior.
- Four original-text restoration tests pass. Direct TypeScript, source Oxlint
  and diff whitespace checks pass.
- All three app apply results succeeded with no pruning or destructive metadata
  actions. No host code was deployed.
- Live worker evidence before the restart: 40 email receipts and 37 discovery
  tasks completed. A stopped old-run provider page could be fetched successfully
  by the read-only diagnostic; its original generic error cannot be reconstructed.
- The final Settings handler executes successfully and returns the validated
  grouped coverage counts. At 02:17 UTC the fresh run had discovered 66 campaigns
  and its first 100 leads, advanced into the Leads phase, and had zero failed
  tasks. Discovery counts are distinct from imported receipt counts.
- The grouped-query runtime shape was verified live. The platform rejects aliases
  of the same root resolver, so coverage uses one flat kind/status grouping. The
  restoration operator similarly sends one mutation root per paced request.

An independent verifier is scheduled on the Mac to run only after restoration
reports complete. It checks all original message fields, selected Person links,
source-lead coverage, sender ownership and duplicate participant direction. Full
history reconciliation must still wait for the paced background import; no
full-history completion is claimed by this handoff.

Code review: [PR #44](https://github.com/fundlevel-digital/twenty/pull/44), draft
while live recovery is being verified. Initial implementation commit:
`76819535b0`.
