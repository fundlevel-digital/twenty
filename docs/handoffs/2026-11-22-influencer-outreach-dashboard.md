# Influencer Outreach Dashboard — 2026-11-22

The subsequent [Attio backup audit](2026-11-22-attio-outreach-backup-audit.md)
confirmed missing historical outreach for 265 influencers with retained POC
emails. The counts below describe imported CRM coverage, not actual historical
outreach completeness. The dashboard now carries an explicit missing-data notice.

## Scope And Live Configuration

Kareem requested outreach visibility on the existing Fundlevel influencer
dashboard. [Decision 0010](../decisions/packages/twenty-apps/public/plusvibe/0010-influencer-outreach-waterfall-dashboard.md)
records the request; [0011](../decisions/packages/twenty-apps/public/plusvibe/0011-defer-poc-ranking.md)
clarifies that ranking does not exist and is deferred.

Native metadata API calls added 13 read-only calculated fields, nine workspace
views (six widget views and three normal table views), and three tabs with 13
widgets to the existing dashboard. The original Overview and its pie chart were
retained, with Outreach Coverage placed first. No core code deployment, app installation, provider import, email
send, campaign enrollment or customer record edit was performed.

- **Outreach Coverage:** every influencer, POC counts, imported lead coverage,
  recorded sends/replies, last send, and an index filtered to no recorded sends.
- **POC Coverage:** every related Person, all their email addresses, related
  influencers, source Lead emails/status, send/reply counts and last send;
  additional indexes identify no recorded leads and no recorded sends.
- **Email Usage:** actual recipient addresses grouped by recorded send count,
  plus recipient/message details.

The [configuration helper](../../packages/twenty-apps/public/plusvibe/scripts/configure-influencer-dashboard.py)
discovers workspace metadata, rejects conflicting calculated field definitions,
resumes partial views and preserves existing widgets. It uses saved CLI
authentication where it runs. Authentication and private verification data
remain on the owner's Mac, outside Git. The initial expired CLI session was
refreshed and saved there without moving credentials into the cloud checkout.

## Verified Data

Independent, fully paginated reads of contact relations and original PlusVibe
message recipients reconciled all POC send/reply calculations:

| Check | Result |
| --- | ---: |
| Influencers | 479 |
| Influencer–POC relations | 587 |
| Duplicate influencer/person pairs | 0 |
| Distinct POCs | 563 |
| Influencers with a POC having recorded sends | 73 |
| Influencers without recorded POC sends | 406 |
| Influencers without a POC relation | 54 |
| POCs with recorded sends | 71 |
| POCs without recorded sends | 492 |
| POCs with recorded replies | 94 |
| Recipient email addresses with recorded sends | 71 |
| Recorded send-recipient rows for those addresses | 88 |
| Imported PlusVibe messages inspected | 1,480 |
| Imported source Leads | 25 |
| Influencer POCs with an imported Lead relation | 0 |

The 25 imported Leads are related to People outside the influencer POC set.
No source Lead identities or Person matches were invented to fill the gap.

## Limits And Verification

Calculations use current visible imported CRM data. Missing history does not
prove no source outreach. Replies may exist without corresponding imported
outbound history. Person counts span all their addresses; source Lead email
columns and address-level send usage are separate evidence. Shared POC activity
appears on each related influencer and does not establish campaign attribution.
Sequence completion, rank and waterfall rounds are not inferred.

Dashboard tables use native pagination without a configured record cap. The
native email bar chart caps at 100 addresses; all 71 current addresses fit.
Native table-page queries passed. The full 479-row query with
all nested calculated columns exceeded the server's query timeout, while normal
20-row table queries passed; filtered no-send totals were slower than other
counts. Source syntax and `git diff --check` passed.

Final chart API readback was interrupted by an overlapping live maintenance
operation: server/worker stopped cleanly, an offsite backup ran and the server
started again. This session did not restart or deploy those services. Final
readback passed after health returned HTTP 200: all three tabs and 13 new widgets
were present; the email chart returned all 71 addresses and exactly 88 recipients,
matching the independently inspected messages, with no group truncation.
Replaying the configuration after removing the six table record caps created
zero fields, views, tabs or widgets. No authenticated browser interaction or
screenshot is claimed. Hindsight was unavailable in this
VM, so no remote memory retention is claimed.
