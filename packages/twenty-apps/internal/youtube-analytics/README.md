# YouTube Analytics

Refreshes the `influencerAnalyticsEntry` records of the Fundlevel workspace from
the YouTube Data API v3. It replaces the `fundlevel-youtube-analytics`
Cloudflare Worker, which wrote the same metrics to the Attio
`influencer_analytics` list.

The app defines no objects or fields. It reads `influencer` and
`influencerAnalyticsEntry` records and writes entry fields that already exist in
the workspace.

## What it does

One logic function, `refresh-youtube-analytics`, has two triggers:

- **Cron, daily at 05:00 UTC**: refreshes every entry whose
  `calculationsEnabled` is true, in one run.
- **HTTP route `POST /s/youtube-analytics/refresh`**: refreshes the entries or
  influencers named in the body (`{ "entryIds": [...] }` or
  `{ "influencerIds": [...] }`). Both **Refresh YouTube analytics** command menu
  items call it:
  - on **Influencer analytics entries**, for the selected entries;
  - on **Influencers**, for every analytics entry of the selected influencers.

  A manual refresh ignores `calculationsEnabled`.

For each entry the function:

1. Reads the linked influencer's `youtubeId`, `youtubeHandle` and `youtubeUrl`.
2. Resolves channel statistics and the uploads playlist with `channels.list`.
3. Pages upload IDs with `playlistItems.list` until 60 qualifying videos are
   found or the playlist ends.
4. Hydrates statistics and durations in 50-ID `videos.list` batches.
5. Skips uploads after the run time, live or upcoming broadcasts, and videos of
   three minutes or less.
6. Computes the trailing-12, 60-day and posting-cadence metrics.
7. Writes the metrics, `averageStatisticsUpdatedAt`, `lastCalculatedAt`,
   `calculationStatus = READY` and an empty `calculationError`. A failed entry
   gets `calculationStatus = FAILED` and the reason in `calculationError`. Its
   metrics are left unchanged.

The Data API does not expose a Shorts flag or aspect ratio. The three-minute
rule is an approximation and can skip a regular short video.

CPM fields are not written. The `live*` CPM fields recalculate from the updated
metrics, and the legacy stored CPMs (`dedicatedCpm`, `dedicatedCpm60d`,
`integrationCpm60d`, `integrationCpm60d1`) are left as they are.

## YouTube calls through treg

Requests go to
`https://treg.to/call/<tool>/youtube/v3/<endpoint>?<query>` with an
`X-Treg-Token` header. treg adds the API key. When a response is a 403 with
reason `quotaExceeded`, `dailyLimitExceeded` or `rateLimitExceeded`, the run
marks that tool as exhausted and moves to the next one. Once every tool is
exhausted, the remaining entries fail with an error that names the tools.

The result counts every request, including retries and rotated requests. A
channel with 60 qualifying videos in its first 100 uploads usually costs five
units: one channel request, two playlist pages and two video batches.

## Variables

Set these in **Settings → Applications → YouTube Analytics**.

| Variable | Secret | Default | Purpose |
| --- | --- | --- | --- |
| `TREG_TOKEN` | yes | none | Sent as `X-Treg-Token`. Runs fail before any call when it is missing. |
| `TREG_YOUTUBE_KEY_TOOLS` | no | `yt-key-fundlevel-internal,yt-key-scheduler-zero` | Comma-separated treg tools that hold YouTube API keys, tried in order. |

## Workspace coupling

`src/constants/universal-identifiers.ts` lists the universal identifiers of the
workspace's `influencer` (`b50d1a77-…`) and `influencerAnalyticsEntry`
(`7b28f559-…`) objects. They were created in the Fundlevel workspace, not by
this app. The command menu items and the function role point at them, so
`app apply` fails on a workspace where those objects have other identifiers.

## Deploy

From this directory:

```bash
yarn install
npx -y twenty@2.59.0 app apply --create --no-prune --no-input --remote fundlevel
```

After the first apply, set `TREG_TOKEN` in the app settings.

## Development

```bash
yarn test            # unit tests (vitest)
yarn typecheck
```
