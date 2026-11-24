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

Implementation and runtime verification are in progress. No complete-history
claim is made. The durable app plan/apply succeeded: 83 creates, 19 updates, zero
metadata deletions or destructive actions. Source deployment uses the complete
current app source; the old Mac staging directory lacked helpers already on main.
The initial Select protocol-value validation failure was corrected before apply;
its dependent default-view errors disappeared with that correction.

Private exports, deployment plans/results, before snapshots and job migration
checkpoints remain under `/tmp/twenty-plusvibe-sync-fix/` on the owner's Mac.
Credentials, raw customer rows and message bodies are excluded from this handoff.


## Live Preservation Finding And Current Blocker

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
were moved one day out. Two old executions were active then; the last successful
follow-up read saw one. No zero-active assertion has been obtained. The applied
durable bundle includes the content-preservation guard. The restoration itself
has **not run**. The Mac command bridge stopped responding after apply; even a
connectivity-only command returned `Timed out waiting for client`. The owner confirmed Conductor was open and connected and requested a retry.
Two subsequent connectivity-only attempts still waited for the client; one
returned the same timeout. A quit/reopen request is pending while independent
source verification continues.

The guarded restoration operator is maintained at
[`restore-original-message-text.py`](../../packages/twenty-apps/public/plusvibe/scripts/restore-original-message-text.py).
Four standalone tests verify exact restoration/readback, rejection of unrelated
content changes, preservation of concurrent edits, and refusal to restore when
other original fields changed. Dry-run/apply requires the private original
snapshots, deployed guard and a read-only check that old replay executions are
idle. It writes only the proven transformation using native GraphQL updates
conditioned on the current text and original ID/source; it never upserts records.

## Candidate Verification And Remaining Execution

- 208 app tests across 28 files pass, including concurrent lease acquisition,
  expired-lease recovery, retained checkpoints after failed publication,
  indefinite rate-limit recovery, rejection isolation, source identity readback,
  private payload handling and settings completion/failure behavior.
- Four original-text restoration tests pass. Direct TypeScript, source Oxlint
  and diff whitespace checks pass.
- The applied core app bundle is verified by the CLI's successful no-prune apply
  result. No host code was deployed. Runtime worker behavior and complete history
  import remain unverified because the Mac bridge disconnected.
- Source refinements after that apply (full-import restart, old-version provenance,
  cooldown status wording, grouped coverage counts and additional recovery tests) still need the final
  candidate applied. Do not equate the committed candidate with a fully verified
  production release.

A live coverage diagnostic also exposed a platform constraint: aliases of the
same root resolver are rejected. The final candidate uses one grouped query
over kind/status, validates the flat result, and refuses to report zero coverage
when the result is malformed. Two regression tests cover this contract. The
restoration operator likewise issues a single mutation root per paced request.
The grouped query still needs its live result checked after reconnection.

When the bridge returns: stage/apply the final candidate with `--no-prune`, run
restoration dry-run/apply after the idle guard passes, then independently verify
all original message fields and Person links. Read the live settings checkpoint
and invoke manager-only `restart-import` with its expected run ID for a full
version-5 discovery. Retire the backed-up old-run queue deliveries so their
one-day postponement does not produce a stale-job burst. Confirm the new worker
can acquire/release its lease, recover a delivery and import/verify real records.
Reconcile all source coverage and outstanding failures after the backlog runs;
no full-history completion is claimed by this handoff.
