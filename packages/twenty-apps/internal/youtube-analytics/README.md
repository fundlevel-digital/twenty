# YouTube Analytics

Defines one **YouTube Channels** object. It stores each channel's name, channel
ID, @handle, URL, uploads playlist ID, subscriber count and calculated metrics.
It does not depend on the workspace's Influencer or Influencer analytics objects.

## Using it

1. In Settings → Applications → YouTube Analytics, add each API key separately
   under **YouTube API Keys**. Requests go directly to Google, without treg.
2. Open **App Preferences → YouTube Analytics → Analytics** and configure **Recent Video Window (2–30 Videos)** (default 12), **Number Timeframes In
   Days (1–366)**, **Percentage Timeframes In Days (1–366)**, and **Metric Format**.
   Type a day value and press Enter or Add to create a removable tag. Entries
   must be actual whole numbers from 1 through 366; duplicates are rejected.
   Add up to 10 tags per group. Both default to 30 Days, 60 Days and 90 Days. The format dropdown offers Numbers Only,
   Percentages Only, or Both. The number and percentage windows are independent.
   Invalid settings fail before any metadata changes or YouTube calls.
3. Create a YouTube Channels record with a channel ID, @handle or YouTube URL.
4. Save settings, select records and run **Refresh YouTube Analytics**. Blank names are filled
   with the channel's public title; existing names are preserved.

The daily 05:00 UTC job refreshes records with **Calculations enabled**. Manual
refreshes ignore that switch. The authenticated HTTP route is
`POST /s/youtube-analytics/refresh`, with `{ "channelIds": ["record-id"] }`.

Calculation preferences apply to all YouTube Channels in the workspace and its
scheduled refresh. Existing saved values and workspace API key connections are
preserved when moving the controls into App Preferences.

## Configurable CRM Columns

A refresh first creates native NUMBER fields for configured metrics. Stable API
names encode the metric and window, such as
`youtubeAnalyticsAverageViewsLast30Days`. Labels use Title Case, for example
**Average Views (Last 30 Days)** and **Average Engagement % (Last 7 Days)**.
A latest-N-videos group uses the Recent Video Window setting.

Number metrics are average/median views, likes and comments. Percentage metrics
are average/median engagement and average view rate. Native percentage fields
store fractional values (`0.05` renders as `5%`) and support normal CRM filters,
sorts and table columns. Count and percentage settings can use different windows.

Synchronization updates visibility in the app's table and channel Fields widgets.
Removing a window or changing format hides its columns; it does not delete fields,
values, filters or user-created table views. Adding that window back reuses the
same fields. Existing fixed-window metrics remain populated for compatibility and
are hidden from the default views. Other records acquire new values on their next
refresh; until then their last successful refresh timestamp remains visible.

Generated columns are workspace custom fields extending the app-owned channel
object. They are not app-manifest entities, so applying an app upgrade does not
prune them. Removing the app or its retained generated fields needs a separate
review of stored data and dependencies.

The app needs native **Data Model** and **Views** permissions to synchronize
columns, and **Applications** permission to load and save its own configuration. Record access remains limited to YouTube Channels. Schema writes are
restricted in code to that object's universal identifier and the app's managed
field prefix/description; existing conflicting user fields are not overwritten.

## Stored Fields And Calculations

Identity includes name, channel ID, handle, URL and uploads playlist ID. Each
refresh imports the largest available channel photo into the native Avatar file
field. Unchanged photos are reused. Missing photos or failed imports preserve the
previous avatar and do not block metric updates. Avatar URL tracks the last
successfully imported source image. Downloads have a 2 MB limit and each request
has a 10-second timeout. Audience
includes public subscribers, or empty when unavailable. Posting fields include
last post date and posts per month. Refresh fields include enabled, status, error,
statistics date, last successful calculation timestamp, and the recent-video
window/count. Failed refreshes retain previous metrics.

Each channel's uploads are fetched once and reused across all configured windows.
The scan covers at least the last 365 days for posting cadence, and enough older
uploads to fill the recent-video window when possible. It stops at the playlist
end or after crossing that boundary with enough videos. A safety limit of 100
pages / 5,000 uploads fails the channel rather than silently publishing incomplete
windows. This replaces the former 60-video / five-posts-per-month cap.

The app excludes future uploads, live/upcoming broadcasts and videos of three
minutes or less. The length filter is a Shorts approximation. Day windows are
rolling periods ending at the run's timestamp, with the boundary included. Empty
windows stay empty. Averages remove the highest- and lowest-viewed videos when
at least four are available; medians use the full window. Likes/comments averages
use the same trimming by views. Engagement is `(likes + comments) / views × 100`;
view rate is average views / subscribers × 100. Posts per month is qualifying
uploads in the last 365 days divided by 12. There are no video objects or snapshots.

## API key pool

Keys are native encrypted workspace connections. Add, replace or disconnect them
individually. The job loads usable connections and deduplicates matching keys.
New requests rotate across healthy keys. Network, 429, 5xx and Google rate-limit
failures retry the same key up to four attempts, with 4/8/16-second backoffs and
longer Retry-After delays honored. Invalid, restricted or quota-exhausted keys
are skipped for that run. Errors identify connection IDs, never secret keys.
After transient retries are exhausted, the affected channel fails and keeps its
previous metrics; that request does not switch keys. Unavailable-key tracking is
in memory for the current run and resets on the next run.

Enable YouTube Data API v3 in the keys' Google Cloud projects. Multiple keys from
the same project share its quota. Additional keys do not increase that project's
allowance.

## Deployment and existing data

```bash
yarn install
npx -y twenty@2.59.0 --no-input --remote <remote> app plan --no-prune
npx -y twenty@2.59.0 --no-input --remote <remote> app apply --no-prune
```

Use `--create` for a first installation. Review the plan before applying an
upgrade. Existing API key connections are preserved by their provider identifier.
This version stops refreshing the old Influencer analytics entries. It does not
copy or delete their records or fields: create/import YouTube Channels records
before switching the production job. Applying without pruning preserves legacy
app settings/actions; remove obsolete app-owned actions in a separately reviewed
pruning plan. Legacy treg settings are unused by this source.

## Development

```bash
yarn test
yarn typecheck
yarn lint
```

## Decisions And Preview Setup

The [decision index](../../../../docs/decisions/youtube-analytics/DECISIONS.md)
records the owner's choices and the verified production rollout, including the
90-channel migration and avatar backfill. The
[handoff](HANDOFF.md) starts with the current deployed state and keeps older notes
as history. For an isolated remote VM, use the
[Twenty remote preview skill](../../../../.agents/skills/twenty-remote-preview/SKILL.md).
