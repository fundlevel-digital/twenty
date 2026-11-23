# Native Cold And Ghosted Dashboards — 2026-11-23

Kareem corrected the standalone preview interpretation and requested the
dashboards inside Twenty. See [decision 0008](../decisions/influencer-outreach/0008-build-dashboards-inside-twenty.md).

The existing **Creator Outreach: Decisions** dashboard now has:

- [Cold](https://crm.fundlevel.co/page/51604fbf-e0f0-465b-a3d7-b55ac4b16932#8606ba86-8336-49b1-b157-7141ae24dfcd): four counts, creator coverage, outreach-not-confirmed details, POCs and imported source sequence status.
- [Ghosted](https://crm.fundlevel.co/page/51604fbf-e0f0-465b-a3d7-b55ac4b16932#3aa43363-e50b-46dc-9c9f-953bd3d222d3): stage counts, conversations, last-replying-POC and all-POC unanswered counts, latest recorded reply, inbox history, POC detail, reply/message evidence, and inbox reply/send-recipient charts.

These are live native metadata changes, with real workspace records. The prior
standalone sample-data app is not the requested deliverable. No CRM stages or
customer message bodies were edited, no provider refresh or host deployment
occurred, and no outreach or campaign enrollment ran.

## Maintenance

The resumable [configuration helper](../../packages/twenty-apps/public/plusvibe/scripts/configure-stage-dashboards.py)
uses saved Twenty CLI authentication on the machine where it runs. Credentials
remain private. Run with the intended remote and dashboard ID; it rejects
conflicting computations unless `--update-computations` is explicitly supplied.
It preserves existing dashboard tabs and widgets. New rich-text descriptions
are maintained on rerun. It removes the known expensive first-inbox column
from its own bulk table views.

The API login origin is distinct from the workspace URL. Links use the
workspace URL returned by `currentWorkspace.workspaceUrls`.

## Verification And Limits

- Final metadata readback: two new tabs, eight Cold widgets and ten Ghosted widgets. Twenty computed fields and seven widget views were added across resumable runs; the final configuration replay created zero duplicates.
- Normal 20-row queries passed: Cold creators 298 total in 1.08 s; Ghosted conversations 23 total in 1.27 s; Ghosted inboxes in 1.19 s; Ghosted POCs 32 total in 1.15 s; reply evidence 42 total in 4.59 s; Cold POCs 332 total in 1.13 s.
- Follow-up counts use recorded PlusVibe TO/CC/BCC participant rows after each POC's CRM `lastInboundAt`. Without that timestamp, they count all recorded sends. The creator total sums per-POC windows, includes the last replying POC, and is not a single shared creator-level window. Shared POCs can appear on multiple creators.
- The selected replying POC uses the most recent existing CRM inbound timestamp. Reply text and inbox identity come from imported PlusVibe messages. Missing imports can leave these blank or incomplete even when historical CRM activity dates exist.
- The exact earliest-inbox computation passed single-record reads but exceeded the server read limit in bulk tables. It remains defined on the POC; bulk views use the reply evidence table with timestamps and inbox identity instead. No approximation was substituted.
- LinkedIn history, inbox access, actual current sequence activity and completed waterfall rounds are not inferred. Imported sequence status is shown as source evidence.
- Browser verification reached Twenty's sign-in page in a fresh context. Signed-in UI rendering was not verified. Authenticated API queries, metadata readback, Python syntax compilation and `git diff --check` passed.
- Hindsight was unavailable; no remote memory retention is claimed.
