# 0007. Render Slack mentions and emoji as readable message content

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack sync
- Related: [Slack implementation](../../slack-sync.md), [area index](DECISIONS.md)

## Context

Backfilled from the owner’s Slack MVP conversation on 2026-11-21 and the verified implementation handoff. Quoted excerpts preserve the supplied wording; agent implementation choices are identified separately.

## Exchange

- 2026-11-21 Kareem: "anyway to format this better?"
- 2026-11-21 Agent: Identified raw Slack mentions and emoji shortcodes in the supplied screenshots and added safe Slack-specific rendering to opened native threads.

## Decision

Show readable mentions and standard emoji in opened Slack conversations, with normal links, emphasis and code formatting.

## Why

The supplied screenshots displayed provider syntax rather than readable conversation text.

## Consequences

Mentions resolve from labels or known participants; standard shortcode emoji render as Unicode. Labeled URLs are restricted to safe schemes. Code remains literal and HTML is never executed. Copy retains the original stored body. App-owned conversation-list summaries remain plain strings; unsupported custom emoji retain their shortcode.

## Evidence

Native SlackMessageText.tsx, isSlackMessagePermalink.ts and focused rendering/clipboard/security tests. Real imported messages were checked in light and dark mode.
