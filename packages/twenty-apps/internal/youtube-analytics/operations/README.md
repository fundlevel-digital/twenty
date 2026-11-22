# Influencer YouTube Channel Migration

This is a workspace-specific data/metadata operation, separate from app releases.
It requires the Influencer, Influencer Analytics Entry and YouTube Channel objects
and an authenticated Twenty CLI remote. It makes no Google requests.

```sh
node operations/migrate-influencer-youtube-channels.mjs plan
node operations/migrate-influencer-youtube-channels.mjs apply
node operations/migrate-influencer-youtube-channels.mjs verify
node operations/migrate-influencer-youtube-channels.mjs cleanup
node operations/migrate-influencer-youtube-channels.mjs verify
```

The default remote is `fundlevel`; `TWENTY_REMOTE` selects another saved remote.
Use the CLI to renew expired authentication before running. Default private state
is `/tmp/twenty-influencer-migration`; `YOUTUBE_MIGRATION_DIRECTORY` overrides it.
Preserve this directory throughout an operation and its verification. Never
commit its record snapshots or credentials. Use a fresh directory for another
workspace or migration; do not reuse an unrelated baseline.

`plan` only reads. `apply` creates workspace-owned extension fields and reuses
channels by parent, legacy entry ID, deterministic record ID or channel identity.
Ambiguous/shared matches stop execution. Existing populated channel values take
precedence; legacy metrics only fill empty fields. New records use Influencer IDs
in the separate channel object, allowing interrupted creates to be resumed.
Four concurrent core API requests write independent records. Logs contain counts
and field names, never CRM record contents. Relaunch `apply` after an interruption;
the first baseline and plan are preserved for verification.

New channels remain disabled for scheduled refresh unless their legacy analytics
entry was enabled. Pricing stays on Influencers; channel CPM formulas reference
it through the parent relationship. Legacy analytics entries remain unchanged.

`verify` checks every planned write, preserves populated pre-existing channel
values, checks all parent links/counts and confirms both Influencer pricing fields
are unchanged. `cleanup` repeats verification before deleting the seven migrated
non-pricing YouTube fields from Influencers. Deleting these fields changes the
workspace schema; inspect the plan and verification before choosing this mode.

See the [decision](../../../../../docs/decisions/youtube-analytics/0007-link-all-influencers-to-channels.md)
and [handoff](../../../../../docs/handoffs/2026-11-22-influencer-youtube-channels.md)
for the authorized production operation and its outcome.

## Copy Pricing Without Removing Influencer Fields

The later owner instruction adds pricing to channels while keeping the originals:

```sh
node operations/copy-influencer-youtube-pricing.mjs plan
node operations/copy-influencer-youtube-pricing.mjs apply
node operations/copy-influencer-youtube-pricing.mjs verify
```

This separate operation creates two nullable NUMBER fields with the source labels,
copies populated Influencer prices onto linked channels, and verifies all channel
prices against their parents. Existing conflicting channel prices stop the copy.
Source fields, source values and CPM formulas remain unchanged. It introduces no
ongoing synchronization. Its private baseline uses `/tmp/twenty-youtube-pricing-copy`
by default, configurable with `YOUTUBE_PRICING_COPY_DIRECTORY`. Remote selection
and authentication follow the migration script's conventions. Preserve its
baseline for verification and keep CRM snapshots outside Git.

See [decision 0008](../../../../../docs/decisions/youtube-analytics/0008-copy-pricing-to-channels.md).
