# 0004. Import Actual Nano Lists In The Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [Original Sync Scope](0001-native-nano-sync-and-discovery.md)

## Exchange

- 2026-11-22 Agent: reported the demo sync completed and identified it as demo data.
- 2026-11-22 Kareem, with screenshots of the preview and Nano: "Yeah I don't see em"
- 2026-11-22 Kareem: "but I have aton in nano"
- 2026-11-22 Agent: acknowledged that the demo run did not satisfy the requested actual list sync, and began checking the owner-added connections for a real import.

## Decision

The requested sync must show the owner's actual Nano lists and saved/hidden
creators. Demo fixtures do not satisfy the original requirement. The current VM
preview may import that Nano data using the connections the owner added there.
This interpretation follows the original sync request and the owner's correction;
it does not authorize a production rollout or paid discovery/enrichment batches.

## Evidence And Implementation

A read-only live check found 60 lists through one saved connection. The second
connection returned HTTP 403 on the session-authenticated list endpoint. The VM
fixture now uses live project/membership reads, while blocking enrichment,
searches and outbound calls. The real source app retains explicit two-way
capabilities. Existing records and saved credentials were preserved.

The first live import created all 60 list records; creator parsing exposed an
email-object format that the demo had not exercised. Final verification and
remaining limitations belong in the [preview handoff](../../handoffs/2026-11-22-nano-influencer-preview.md).
