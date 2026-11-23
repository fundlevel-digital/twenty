# Native Enum Field Backfills

Install the updated app definitions before backfilling. Existing field types
cannot change in place, so legacy text/diagnostic fields keep their identifiers;
new Select fields carry the categorical value. Default view columns point at
new view entries, retaining the old entries with visibility off. Imports write
both forms for compatibility. Existing Select/Multi-Select fields need no change.

`enum-field-backfills.json` lists the eight targets across Cal.com,
NanoInfluencer, PlusVibe, Slack Sync and LinkedIn Sync. Each app's normalization
helper is shared by its runtime and this CLI. Unknown categorical values become
Other where available; their raw values are retained. Missing values stay blank.

Provide `TWENTY_API_URL` and `TWENTY_API_KEY` through your private environment.
The CLI prints counts, never credentials, record IDs or customer values.

```bash
node packages/twenty-apps/operations/backfill-enum-fields.mjs --app cal-com
node packages/twenty-apps/operations/backfill-enum-fields.mjs --app cal-com --apply
```

Omit `--app` to include installed target apps. The default is a dry run.
Preflight validates every target field's universal identifier, type, name and
allowed options before any writes, including its owning object. Queries use the
object's registered plural name from metadata. Records paginate in batches of
100. Existing selections are not overwritten; reruns skip populated targets. Partial record
updates are resumable. Backfills do not call external providers or initiate
provider sync. Review counts and the target URL before applying to a live CRM.

```bash
node --test packages/twenty-apps/operations/backfill-enum-fields.test.mjs
```

The owner's rule and request are recorded in
[decision 0008](../../../docs/decisions/0008-use-native-enum-fields-across-apps.md).
