# 0002. Store Analytics In One YouTube Channels Object

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Timeframe columns](0003-timeframe-columns-and-validated-tags.md), [Avatars](0006-native-channel-profile-photos.md)

## Context

The inherited approach wrote analytics through Influencer-related objects and
fields. After asking what would be populated, Kareem wanted an app-owned object.

## Exchange

- 2026-11-21 Kareem: "Ok, what fields and stuff are we populating?"
- 2026-11-21 Agent: described the existing Influencer-based fields and calculations.
- 2026-11-21 Kareem: "Hmmm; I don't like that right now;"
- 2026-11-21 Kareem: "Let's just add youtube analytics objects"
- 2026-11-21 Kareem: "Call just make one called like \"YouTube Channels\" or something, u can store sub, calculations, ids/@'s, etc"
- 2026-11-21 Kareem: "Every field/object needs to be in title case"
- 2026-11-21 Kareem supplied `Symbol.png` and asked: "please use this as the image for the app"
- 2026-11-21 Agent: created one native channel object, its table/sidebar entry and refresh action, and used the supplied image as the app logo.

## Decision

Use one app-owned **YouTube Channels** object for identity, public subscribers,
calculations and refresh status. App-defined labels use Title Case. Use the
owner-supplied image for the app's branding. Do not create separate video or
snapshot objects or require an Influencer relationship.

## Why

Kareem explicitly rejected the current population approach and asked for a
single channel-oriented object containing identifiers and calculated values.
The labels and app image are direct owner preferences.

## Consequences

API names remain `youtubeChannel` / `youtubeChannels`; display labels are
YouTube Channel / YouTube Channels. Identity includes Name, Channel ID, Handle,
Channel URL and Uploads Playlist ID. Subscribers may be empty when hidden or
unavailable. The object also holds posting cadence, last post date, analysis
window/count, enabled state, calculation status, error and refresh timestamps.
Dynamic metrics extend this same object. The later avatar fields are covered in
record 0006.

The app's record permissions read and update YouTube Channels only. Legacy fixed
metric fields remain populated for compatibility but are hidden in the default
view. Old Influencer analytics records were retained during migration. Native
system labels rejected customization with `FIELD_MUTATION_NOT_ALLOWED`; no
server workaround was added to rename them.

## Evidence

- Owner messages and supplied app-image attachment, 2026-11-21.
- [Object manifest](../../../packages/twenty-apps/internal/youtube-analytics/src/objects/youtube-channel.object.ts).
- [Default view](../../../packages/twenty-apps/internal/youtube-analytics/src/views/youtube-channels.view.ts).
- [App configuration](../../../packages/twenty-apps/internal/youtube-analytics/src/application.config.ts) and [logo](../../../packages/twenty-apps/internal/youtube-analytics/public/youtube.png).
- [Merged PR #4](https://github.com/fundlevel-digital/twenty/pull/4).
