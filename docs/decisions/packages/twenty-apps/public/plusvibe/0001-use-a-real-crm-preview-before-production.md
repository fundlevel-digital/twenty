# 0001. Use a Real Twenty Preview Before Production

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

The PlusVibe integration needed review against actual Twenty records and native
connection, messaging, and settings behavior. An initial mock did not satisfy
that requirement. Later changes needed an isolated place to test schema and
privacy changes without applying them to the production CRM.

## Exchange

- 2026-11-21 Kareem: "Also, don't deploy to my CRM yet plz, just make a preview on ur VM"
- 2026-11-21 Kareem: "U can use our prod data/secrets to seed"
- 2026-11-21 Agent: initially supplied a mock preview.
- 2026-11-21 Kareem: "Bro i meant a actual twenty crm preview hosted on ur vm, not a mock apge"
- 2026-11-21 Agent: replaced the mock with a real isolated Twenty instance and an approved data snapshot.

## Decision

Use an actual Twenty server, database, worker, installed application and native
frontend in the VM. Production data/secrets may be used to seed the isolated
preview. This permission does not authorize deployment, repair writes, import
restarts or new provider webhook registrations against production after the
preview-only instruction.

## Why

Kareem explicitly separated preview work from production deployment and rejected
a mock as the review surface.

## Consequences

The preview runs the full application against a local backend. Browser APIs and
WebSockets route locally; public frontend assets were cached from the existing
fork. The copied snapshot includes seven source Leads/conversations and three
native messages. Unavailable provider Lead IDs/statuses remain blank.

The later native user connection was entered by a member in the VM. The agent
saved requested preferences there without selecting workspaces or starting sync.
Before a production upgrade, old text fields/single relations and mixed mail
channel associations still require a verified data migration. Channel-scoped
message identities must be preserved to avoid duplicate history on reimport.

## Evidence

- Real-browser checks exercised native key entry, People messages, source objects,
  and Apps preferences against the local server.
- Subsequent app updates used the `vm-preview` remote at `http://127.0.0.1:3000`.
- The session preview URL was `https://fundlevel-w890.conductor.show/`; it is an
  ephemeral review environment, not a deployment target or stable runbook.
- Earlier production state is not inferred from local commits. The later preview
  revisions and pending upgrade boundary are documented in the app README.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
