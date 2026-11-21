# 0005. Migrate And Verify The Live YouTube App

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Connections](0001-native-api-key-connections.md), [Object](0002-one-youtube-channels-object.md), [Later avatar rollout](0006-native-channel-profile-photos.md)

## Context

The redesigned app had been built and tested in an isolated preview. Production
still had enabled legacy analytics entries, and a native connection was needed
before the new daily refresh could calculate real data.

## Exchange

- 2026-11-21 Kareem: "Did u seed and test w/ real data?"
- 2026-11-21 Kareem: "Why did we only have 90?"
- 2026-11-21 Agent: established that 90 was the existing enabled legacy-entry count, not a channel limit. The handoff did not establish why those particular entries had originally been enabled.
- 2026-11-21 Kareem: "merge to main and deploy"
- 2026-11-21 Agent: merged and deployed, migrated the enabled records, then found production would not create an API-key connection from the CLI's OAuth principal. Requested browser connection creation without exposing the key.
- 2026-11-21 Kareem: "I’ve added the production API key"
- 2026-11-21 Agent: completed a single-channel calculation, the full enabled batch and independent API verification.

## Decision

Merge and deploy the native app to the live Fundlevel instance. Migrate all 90
enabled legacy analytics entries into YouTube Channels, preserve the originals,
and verify actual fresh calculations after the owner adds the production key.
Use normal application/core APIs for metadata and CRM writes, not production SQL.

## Why

Kareem explicitly authorized the merge/deployment and confirmed connection
creation. Fresh execution was necessary: copied legacy metrics and preserved
timestamps alone would not prove that the new app worked against YouTube.

## Consequences

- [PR #4](https://github.com/fundlevel-digital/twenty/pull/4) merged as
  `1741e69d0be7736b4202084f632cf6327f264d14`.
- The app was applied through the Twenty CLI. No server image deployment was
  needed. Initial deployed content hash:
  `9180e5a82a07c6ef8693db51b6c677eb0019a34d33f32deeadf01b29a79a027c`.
- Migration copied all 90 enabled entries' identities, names, metrics,
  timestamps and enabled state through single-record core API creates. New IDs
  matched old entry IDs across distinct objects. Original records remained.
  No duplicate or missing identities were found. The attempted bulk-create
  input/mutation was unavailable; individual creates worked.
- Production connection creation rejected CLI OAuth with `PERMISSION_DENIED`;
  the owner added the key through the browser. No key value is retained here.
- The daily cron remains **05:00 UTC**, selects enabled channels and has a
  900-second function timeout. Manual selection ignores the enabled switch.
- A reviewed cleanup plan removed six obsolete app entities/permissions/variables,
  without deleting CRM records or fields. Generated workspace metric fields are
  retained custom extensions; uninstalling them needs a separate data review.

## Evidence

Production: [YouTube Channels](https://crm-login.fundlevel.co/objects/youtubeChannels),
[App Preferences](https://crm-login.fundlevel.co/settings/app-preferences/cb7f8a34-0b8f-44c8-b07d-db9bc706e836#eb75b601-a4c2-4b39-8b72-6fd55018cdb7).

The first complete live run was **2026-11-21 15:57:02.045–15:57:58.149 UTC**:
90 selected, 90 written, zero failures, missing identities, not-found channels
or unavailable credentials. It made 526 Google requests: 2 channel, 262 playlist
and 262 video requests. Independent core API reads found 90 enabled / 90 Ready,
all successful timestamps fresh from that run, no errors, and 90 resolved
subscriber/channel/playlist values. 81 channels had qualifying 30-day metrics;
empty windows intentionally remained empty.

Source validation at PR #4: 125 tests, direct TypeScript checks, lint and CLI
build/manifest checks passed. Preview integration covered real YouTube data and
native table filtering/sorting. Record 0006 documents the later avatar release,
its current production hash and the second full verification run.
