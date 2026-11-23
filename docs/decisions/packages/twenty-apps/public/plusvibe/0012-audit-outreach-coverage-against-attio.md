# 0012. Audit Outreach Coverage Against Attio

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: PlusVibe
- Related: [Dashboard Request](0010-influencer-outreach-waterfall-dashboard.md), [Audit Handoff](../../../../../handoffs/2026-11-22-attio-outreach-backup-audit.md)

## Context

The dashboard reported 406 influencers without recorded PlusVibe sends in the
current CRM. Its calculations had been reconciled against imported messages,
but the completeness of those messages had not been established.

## Exchange

- 2026-11-22 Kareem: "Now way 406 don't have sends - must either not be linking the POCs correctly, or missing data from plusvibe."
- 2026-11-22 Kareem: "Can u find our latest attio backups on google drive or backblaze r2?"
- 2026-11-22 Agent: located the newest Attio archive found in Google Drive,
  inspected influencer/People/campaign history CSVs and compared POC addresses
  with current Twenty relations and fresh recorded-recipient data.

## Decision

Investigate historical Attio backups as evidence for missing POC links or
missing outreach data. Treat the 406 count as incomplete CRM coverage rather
than a verified list of influencers who were never contacted.

## Why

Kareem challenged the count based on prior outreach and explicitly requested
the backup lookup.

## Consequences

The audit found 265 matched influencers with dated Attio sends whose same POC
email remains related in Twenty but lacks a recorded PlusVibe send there. The
dashboard notice now explicitly describes the missing historical data.
The evidence supports missing outreach history for these cases; it does not
establish the provider-side cause or classify the remaining no-send records.
No restore or source-Lead creation was part of the lookup.

## Evidence

See the [audit handoff](../../../../../handoffs/2026-11-22-attio-outreach-backup-audit.md)
for archive dates, aggregate counts, matching method and limits. Customer
records, credentials and private sharing links remain outside repository docs.
