# 0001. Attio-Style Record Comments

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments

## Context

Kareem requested a comments app and supplied seven screenshots showing Attio's record comments, mention picker, Inbox notification indicator, replies, resolution, options and filters.

## Exchange

- 2026-11-22 Kareem: "Yo can u make me a comments app?"
- 2026-11-22 Kareem: "I wanna mirror the Attio comment system."
- 2026-11-22 Kareem: "It let's u add emojis, and mention things (usesrs & recrods)"
- 2026-11-22 Agent: Inspected the supplied images and existing SDK Inbox APIs; implemented an installable app with persistent comments and record commands. App architecture is an implementation choice, not an additional owner decision.

## Decision

Support comments on records across objects, emoji insertion, user and record mentions, Inbox mention notifications, replies, resolution, deletion, copied links and per-record filters.

## Why

Kareem explicitly chose the Attio comment system as the reference. The screenshots supply the expected interactions.

## Consequences

Source implementation lives in [the Comments app](../../../packages/twenty-apps/internal/comments/README.md). It uses an authenticated route, an app-owned custom object and Twenty's Inbox message API. Existing record and Inbox infrastructure remains the host surface.

## Evidence

The implementation passes TypeScript checks, CLI packaging and behavior tests. Component rendering was checked with sample data in light and dark mode. It has not been installed or verified against a live CRM. Copy Link opens a record and requires opening Comments to select the thread; emoji reactions, live subscriptions and bidirectional Inbox replies are outside the implemented scope. These are implementation limits, not owner-approved omissions. See the app README for the maintained verification and limits.
