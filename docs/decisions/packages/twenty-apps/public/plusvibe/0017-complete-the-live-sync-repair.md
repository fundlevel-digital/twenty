# 0017. Complete The Live PlusVibe Sync Repair

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Sender Ownership](0016-senders-are-owned-historical-inboxes.md), [Repair Handoff](../../../../../handoffs/2026-11-23-plusvibe-sync-repair.md)

## Context

The preceding investigation established missing source leads and external contacts
incorrectly represented as organization-side sender inboxes. Kareem required the
repair to be carried through rather than another confirmation of the problem.

## Exchange

- 2026-11-23 Kareem: "Did I didn't ask u to fucking confirm, fucking fix it, shit for brains"
- 2026-11-23 Agent: recovered the complete source lead directory, deployed ownership and message-identity safeguards in the PlusVibe app, and prepared backed-up message, participant, association and sender repairs.

- 2026-11-23 Kareem: "try now"
- 2026-11-23 Agent: retried the prepared maintenance operation; Conductor returned "Timed out waiting for client", including for a read-only status check. No successful SSH or transaction result was received.

## Decision

Complete the authorized live PlusVibe sync and historical sender-data repair.
Preserve selected Person relations and original message contents. Retain owned
historical inboxes; do not infer that an external From address is ours.

## Why

The owner explicitly required action after the diagnostic-only response. The
existing dashboards need complete source coverage and truthful inbox attribution.

## Consequences

The app now distinguishes verified and unresolved historical inboxes. Provider
record IDs identify imported messages because actual source records reuse RFC
message IDs. Known ownership also corrects historical source rows whose incoming
flag contradicts their organization-side From header. Unknown inboxes remain
unresolved rather than generating external Sender records.

The bounded repair function requires application management permission and a
selected source workspace. App deployment uses `--no-prune`; no host code change
or provider campaign enrollment is part of this repair. Native association writes
are blocked by the public API and require a guarded maintenance transaction.

## Evidence

The authenticated source export contains 15,814 leads. All source rows were
upserted successfully; 7,241 previously selected Person relations were checked
without changes. The app's 168 tests, direct TypeScript check and changed-file
lint passed. Live repair progress, counts and any remaining work are maintained
in the linked handoff rather than inferred from deployment success.
