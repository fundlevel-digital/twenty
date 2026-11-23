# Attio Backup And Outreach Coverage Audit — 2026-11-22

## Located Backup

Google Drive's **Fundlevel Attio Backups** folder contains five Attio export
ZIPs. The newest located archive is 464,646,081 bytes, uploaded on October 31,
2026 at 01:00:32.739 UTC. Its ZIP entry dates are October 28, 2026, so the upload
date must not be reported as the export generation date.

The archive has 78 entries. The relevant CSVs were read successfully from the
downloaded ZIP, including influencer, People, campaign history and campaign
history values. A paginated-capable Drive API search for Attio/export names
returned no newer Attio export and no next page. This is the newest backup found
in the accessible Drive account, not proof that no newer copy exists elsewhere.

The existing Mac rclone Drive connection supplied read access. The Google Drive
plugin was discoverable but unconnected. No available rclone remote exposed
Backblaze/R2 in the inspected Mac and deployment-host configurations; object
storage was not independently inventoried. Older migration and attribute-audit
artifacts were also found on the deployment host, dated October 21–22.

The export and customer-level comparison files remain in a private audit
directory on the owner's Mac, outside Git. Direct Drive links were provided in
the user conversation rather than copied into repository documentation.

## Findings

| Export Evidence | Count |
| --- | ---: |
| Influencers | 439 |
| People | 18,096 |
| Distinct People referenced as influencer POCs | 498 |
| Cold Email Campaign History entries | 11,634 |
| Campaign history value rows | 152,628 |
| Campaign entries referencing influencer POCs | 621 |
| Influencer POCs with a dated latest send | 341 |
| Influencers with dated POC sends | 338 |

The campaign history also preserves source Lead IDs, used lead emails, campaign
and workspace IDs, latest completed step, sequence-completed flags, lead sequence
status and reply classification. These are historical source records, not newly
imported native messages. Campaign entries count campaign/lead history, not the
number of individual emails sent.

## Current CRM Comparison

All 439 backup influencers matched uniquely to current influencers using
Unicode-normalized, whitespace-normalized, case-folded names. Every backed-up
POC email address remained among the emails of People currently related to its
matched influencer. This is an address-level preservation check, not a proof of
immutable record identity or that every newer CRM relation is correct.

For all 338 influencers with historical dated sends, at least one historical
**Lead Email Used** still belonged to a current related POC. Of these, 265 had no
recorded PlusVibe sends to their current related email addresses. The comparison
used a fresh, fully paginated query of the previously independently verified
recipient predicate, excluding drafts, sender rows and Reply-To headers.

This establishes missing outreach evidence in current imported CRM messages for
those 265 cases despite retained POC emails. It does not establish whether the
provider lacks history, sync selection is incomplete, imports failed, historical
messages were omitted or deleted, or an earlier migration dropped associations.
The remaining records in the 406 no-recorded-send bucket are not proven untouched.

Attio's reference cells contain multiple UUIDs, including object IDs. Relation
parsing intersected their UUIDs with the People export's actual Person IDs;
raw-cell equality would incorrectly report zero matching history. CSV email
addresses were parsed and normalized before comparison. No customer names or
addresses are reproduced here.

## Live Change And Remaining Work

Updated the existing **How To Read Coverage** widget through the metadata API
with an explicit, dated missing-history notice and the 265-case finding.
The existing dashboard's calculations continue to show imported data. No source
Lead identities were invented, People relations changed or historical messages
restored during this audit.

Before this dashboard can identify influencers never contacted, reconcile the
historical campaign/lead records with the PlusVibe source and imported messages.
Preserve the distinction between a full sequence, a campaign record and a single
send. Restoring the campaign history alone does not recreate message bodies or
prove exact send counts.

Hindsight recall remained unavailable in the cloud VM, so no memory retention
is claimed. Owner correction and requested scope are recorded in
[decision 0012](../decisions/packages/twenty-apps/public/plusvibe/0012-audit-outreach-coverage-against-attio.md).

## Follow-Up: Full PlusVibe Export And Import Failure

Kareem asked: "Yeah but why is it missing? SHouldn't it be in our plusvibe data?"
He then supplied a full PlusVibe lead CSV. The attachment remains in private
conversation context and is not copied into repository documentation.

The export has 15,814 rows and 15,066 distinct normalized email addresses,
including Attio Person IDs, campaign, sender, sent step, last-send timestamps,
reply counts and statuses. Matching current POC primary/additional emails found:

| Comparison | Count |
| --- | ---: |
| POCs matching source export leads | 342 |
| Influencers with matching source leads | 339 |
| POCs with source send evidence | 341 |
| Influencers with source send evidence | 338 |
| POCs with source sends but no imported sends | 270 |
| Influencers with source sends but no imported sends | 265 |

Source send evidence means a nonempty `last_sent_at` or `ws_last_sent_at`, or
positive `sent_step`. These are source lead facts, not exact native message
counts. Multiple export rows can share an email across campaigns; the 15,814
rows must not be treated as unique People.

An administrator read-only database transaction found the selected Fundlevel
PlusVibe workspace's version-3 import checkpoint in **failed** phase, with
`processed=66`, last updated **2026-11-22 03:01:15 UTC**. Twenty still contained
25 source Leads and 1,480 PlusVibe messages at the check. A failed checkpoint
does not identify the original exception or establish which phase failed.

Read-only calls with the existing PlusVibe account key confirmed access to the
same selected source workspace. The lead endpoint returned ten records on its
first page and ten different records on the next cursor page, so lead pagination
was advancing in that probe. Three missing-send examples returned 4, 4 and 3
campaign-sent messages directly from the provider. Source history therefore
still exists for those checked cases.

All eleven example campaign messages lacked a sender address in `eaccount`,
`email_account_name`, `sender_email`, `from_address_email` and `from_email`.
The corresponding export rows also had blank sender fields. The current
`lead-emails.ts` importer only recovers absent senders from an unambiguous existing
CRM conversation for the same workspace, campaign and lead. Without that evidence,
`mapEmail` rejects a message missing its sender. This is a separately verified
backfill limitation, not proof of the exception that caused the 03:01 failure.

The importer processes campaigns, Unibox, archived Unibox, then the lead directory;
an earlier failed phase prevents the complete lead scan and its per-lead sent
history jobs. Leads imported from partial email activity are not proof that the
directory phase ran. The failed checkpoint establishes incomplete ingestion;
it does not establish that PlusVibe lost these leads or that the current POC
email relations caused the missing sends.

The exact run was not found in retained queue records. Application audit-log
querying reported that ClickHouse was not configured, so the original failure
exception remains unverified. The recent deployment's unrelated retained failed
jobs were not retried or altered. No source API writes, import restart, CSV
restore or app deployment was performed during this diagnostic work.
