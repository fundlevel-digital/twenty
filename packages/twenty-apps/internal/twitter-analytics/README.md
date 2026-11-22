# TwitterAPI.io

Native Twitter Profiles and public post analytics, following the YouTube Analytics
app's native connections, App Preferences and configurable CRM columns. The logo
is TwitterAPI.io's favicon, downloaded from its website.

## Use

1. Install in a workspace with the existing Influencer object (universal identifier
   `b50d1a77-2489-4795-aa30-e55a1b14c6e9`). The app extends that object; it does not
   create another Influencer object.
2. Add a key through Settings → Applications → TwitterAPI.io → Add Connection.
   Keys use native encrypted workspace connections, one connection per key.
3. Select up to 100 Influencers and run **Import Twitter Profiles**. The import
   discovers Twitter/X URL and Handle fields, including native Links values and
   secondary URLs. It creates related profiles without making external API calls.
   Reruns reuse matching handles. Existing relationships to another Influencer
   are preserved. Newly imported profiles have **Calculations Enabled** off.
4. Each Influencer has many Twitter Profiles; each profile belongs to at most one
   Influencer. The relation is editable and deleting an Influencer retains its
   profiles with an empty relation.
5. Open App Preferences → TwitterAPI.io → Analytics. Set independent number and
   percentage day windows (1–366, up to 10 each), Numbers Only / Percentages Only /
   Both, and a separate recent-post count (2–30, default 12). Day windows default
   to 30, 60 and 90. Preferences affect the workspace's shared calculations.
6. Create a profile with a handle or an X/Twitter profile URL, or select imported
   profiles and run **Refresh Twitter Analytics**. A user ID is saved on refresh;
   initial lookup requires a handle or profile URL.

The source includes a daily 05:00 UTC refresh of enabled profiles. Manual refresh
ignores the enabled switch. Preview cron registration is disabled to avoid
unattended API spending.

## Metrics

Profile fields include user ID, handle, URL, native avatar, followers, following,
refresh status, error, latest successful refresh and posting cadence. Native
NUMBER fields hold average/median views, likes and replies; average/median
engagement and average view rate, for each configured day window and recent-N
sample. Percentage fields store fractions for Twenty's percentage formatter.
These columns support ordinary CRM sorting, filtering and view configuration.
Removing a timeframe hides its managed columns without deleting saved values.

Only original public posts and quote posts qualify. Replies, reposts, future posts
and duplicate post IDs are excluded. Engagement is
`(likes + replies + reposts + quotes) / views`; view rate is average views divided
by followers. Averages trim the highest- and lowest-viewed posts with four or more
posts; medians use all posts. Empty windows are empty. Posts Per Month is the
qualifying last-365-day count divided by 12.

The client uses `/twitter/user/info` and cursor-paginated
`/twitter/user/last_tweets`. It scans at least 365 days and all configured windows,
and farther when necessary to fill the recent-post sample. It stops at timeline
exhaustion or a covered boundary with enough posts. A 100-page limit or repeated
cursor fails instead of publishing incomplete calculations. Missing public views
also fails rather than recording a fake zero. Failed refreshes preserve earlier
metrics and their successful timestamp. Suspended/protected profiles cannot be
calculated. These are public post statistics, not private X account analytics.

Requests are spaced at least 5.1 seconds apart per key, including concurrent
profile work, to support accounts that have never topped up. New requests rotate
usable keys. Network, 429 and 5xx failures retry up to four
attempts on the same connection with 4/8/16-second waits and Retry-After support.
HTTP 401/402/403 skips that connection for the run. Errors never include key values.
Each timeline page can consume paid TwitterAPI.io credits; importing CRM handles
itself is free of external API calls.

## Development And Installation

```bash
yarn install
yarn test
yarn typecheck
yarn lint
npx -y twenty@2.59.0 --no-input --remote <remote> app plan --no-prune
npx -y twenty@2.59.0 --no-input --remote <remote> app apply --create --no-prune
```

Use `--create` only for first installation. Review the plan before applying an
upgrade. Existing native connections and generated metric fields are retained.
The role reads Influencers, reads/creates/updates Twitter Profiles, and needs
Data Model, Views, Applications and Upload File permissions for its own analytics
columns, preferences and avatars.

See the [decision](../../../../docs/decisions/twitter-analytics/0001-native-twitter-profiles-and-preview.md)
and the [preview handoff](../../../../docs/handoffs/2026-11-22-twitter-analytics.md)
for implementation and verification limits.

## Company And Person Workflows

The app installs **Relate Company Twitter Profiles** and **Relate Person Twitter
Profiles** as native workflows. A Company or Person creation/update runs a logic
step that reads the saved preferences. Both default to Off, so installation alone
does not create or backfill their profiles.

Open **App Preferences → TwitterAPI.io → Profile Relations**. Each object has
independent controls:

- **X Link Field**: select an existing Text or Links field, or detect an existing
  X field. Live Fundlevel already has PDL's `pdlTwitterUrl` (X / Twitter) and the
  legacy `twitter` text field. The app reuses these rather than installing new X
  fields. Detection prefers `xLink`, then `pdlTwitterUrl`, then the other common
  Twitter/X field names; explicitly selecting a field overrides detection.
- **When Records Are Created or Updated**: Off, Relate Existing Profiles Only,
  or Create Missing Profiles and Relate.
- **When X Links Change**: Keep Existing Relations, or Replace Automatically
  Managed Relations. Replacement removes obsolete app-managed memberships only.
  It preserves manual relations, other parents and the profile records. Invalid
  links preserve previous memberships instead of clearing them.
- **Existing Records**: choose whether a backfill may create profiles. Save the
  preferences, run **Preview Backfill**, review the counts, then **Run Backfill**.
  Backfills page through all records, report progress and can stop after the
  current batch. Automatic creation can stay Off while a manual backfill runs.

Links use native join objects **Twitter Profile Companies** and **Twitter Profile
People** with unique profile/parent indexes. This permits one profile to relate
to many Companies and many People, while every Company or Person can relate to
many profiles. Primary and secondary X URLs are normalized and deduplicated.
Repeated backfills and workflow runs reuse profiles and existing memberships.
The Influencer Has Many relation remains independent of these memberships.

Creating or relating profiles makes no external TwitterAPI.io calls. Newly created
profiles retain disabled scheduled analytics. Refreshing their analytics is a
separate explicit action or an enabled scheduled calculation.

See [API Requests And Raw Response Examples](API.md) for endpoint parameters,
actual public response shapes and the multiple-key waterfall behavior.
