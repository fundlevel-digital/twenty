# 0001. Native Twitter Profiles And An Isolated Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: twitter-analytics
- Related: [YouTube Analytics](../youtube-analytics/DECISIONS.md)

## Context

Kareem requested a TwitterAPI.io integration following the YouTube Analytics app.

## Exchange

- 2026-11-22 Kareem: "Can you please make a https://twitterapi.io/dashboard App (get image from favicon)"
- 2026-11-22 Kareem: "I'd like it to work like the YouTube analytics app"
- 2026-11-22 Kareem: "Like I want analytics, and a \"Twttier Profiles\" object too"
- 2026-11-22 Kareem: "U can use the Influencer data to get a bunch of profiles; u can then also set it up so that Influencers have a one to many relation to twitter accounts"
- 2026-11-22 Kareem: "Plz build this and setup a preview on ur account"
- 2026-11-22 Agent: implemented native connections, App Preferences, configurable metrics, a related profile object and an import action; created an isolated VM preview.
- 2026-11-22 Kareem: "Use `[REDACTED API KEY]`" (the credential is explicitly redacted).
- 2026-11-22 Agent: saved the supplied key through the preview's native encrypted connection API and performed bounded public-profile verification.

## Decision

Build TwitterAPI.io as a native SDK app with favicon branding and a Twitter
Profiles object. Each Influencer can have multiple Twitter Profiles. Import
existing Influencer handles/URLs into related profile records. Provide analytics
controls and refresh behavior patterned after YouTube Analytics and an isolated
preview for review.

## Why

Kareem explicitly chose YouTube Analytics as the model and requested the relation,
branding and preview. Defaulting imported records to disabled scheduled refresh
is an implementation choice to keep imports from immediately spending credits.

## Consequences

Source lives in `packages/twenty-apps/internal/twitter-analytics`. The app extends
the established Influencer universal identifier and does not own that object.
It uses native API-key connections and generates workspace metric fields.
No production deployment or customer-data migration was performed. Mac access
timed out; the preview's Influencer import verification uses neutral demo records.

## Evidence

- [App README](../../../packages/twenty-apps/internal/twitter-analytics/README.md)
- [Preview handoff](../../handoffs/2026-11-22-twitter-analytics.md)
- [User endpoint](https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username)
- [Timeline endpoint](https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets)

Implementation, isolated preview installation and live external verification are
tracked separately in the handoff. This record does not authorize production changes.
