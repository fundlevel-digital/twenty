# 0001. Build a Slack MVP using Twenty’s native messaging

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "Alr, build a MVP"
- 2026-11-21 Agent: Continued the inherited Slack application work using native Message and MessageThread records, app-owned channel records, per-member connections and queued imports.

## Decision

Deliver a working Slack MVP in Twenty. Reuse native message and thread records rather than creating a separate conversation store.

## Why

The owner requested a working MVP and subsequently asked to extend the existing message object. Native readers supply existing record timelines, permissions and attachments.

## Consequences

The Slack app owns connection/discovery/event/backfill functions and Slack-specific metadata. The fork provides provider deduplication, ingestion, metadata updates and native timeline access. This is implemented in the VM preview; it is not a production deployment.

## Evidence

packages/twenty-apps/internal/slack-sync/src; native application-message-ingestion.service.ts; handoff.md. Continuous sync still requires the app’s own Slack OAuth authorization.
