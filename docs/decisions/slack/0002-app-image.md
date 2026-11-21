# 0002. Use the supplied Slack app image

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "also please use this as the app image"
- 2026-11-21 Agent: Copied the supplied JPEG into the Slack app and used it for the application and connection-provider logos.

## Decision

Use the owner-supplied image for the app and its connection provider.

## Why

The owner supplied the asset and explicitly requested it.

## Consequences

The app serves public/slack-icon.jpeg. Reuse that file instead of generating a replacement brand asset.

## Evidence

packages/twenty-apps/internal/slack-sync/public/slack-icon.jpeg; app and connection-provider definitions. Original request included Icon.jpeg.
