# 0001. Use Native API-Key Connections Instead Of Treg

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: youtube-analytics
- Related: [Production rollout](0005-production-migration-and-verification.md)

## Context

The inherited app called YouTube through treg. Kareem questioned that dependency
and wanted a credential pool managed through a proper multi-value interface.
OAuth was considered before the choice returned to API keys.

## Exchange

- 2026-11-21 Kareem: "Why are we using treg at all?"
- 2026-11-21 Kareem: "Can we change it? Like just let me supply multiple keys to the thing; or even better: Multiple OAuth connections, and then use the YT dadta api key of that connection, and credential pool it"
- 2026-11-21 Agent: explained that OAuth returns access tokens, not API keys, and Google Cloud projects own the API quota; OAuth would need authorization and refresh flows.
- 2026-11-21 Kareem: "Multiple OAuth connections"
- 2026-11-21 Kareem: "Wait, with OAuth, who's credit does it use? The owner of the OAuth client, or the person signing in?"
- 2026-11-21 Kareem: "Oh ok, then just allow multiple API keys then"
- 2026-11-21 Agent: proposed one secret setting containing comma/whitespace-separated keys.
- 2026-11-21 Kareem, quoting that proposal: "WHy? Can't we just have a proper way to add multi-value things?"
- 2026-11-21 Agent: implemented native encrypted workspace API-key connections, one connection per key, and direct Google API requests.
- 2026-11-21 Kareem: "How are we handling 429 and out of quota errs?"
- 2026-11-21 Agent: inspected and explained the existing retry/failover behavior; that question did not introduce a new retry policy.

## Decision

Use native workspace API-key connections, managed individually through Settings
→ Applications → YouTube Analytics → Add Connection. Load usable connections at
refresh time, deduplicate matching key values and rotate new requests across
healthy credentials. Remove treg and the proposed CSV secret setting. Do not
implement an OAuth connection flow for this app.

## Why

Kareem chose API keys after clarifying quota ownership and rejected a single
multi-value secret string as the management UI. Multiple keys from one Google
Cloud project share that project's quota; a new key is not a new quota budget.

## Consequences

The app calls Google's YouTube Data API directly. Keys remain in native encrypted
connections; errors identify connection IDs rather than key values. The reviewed
production prune removed `TREG_TOKEN`, `TREG_YOUTUBE_KEY_TOOLS`, the legacy action
and its unused permissions, without deleting channel records or analytics data.

Verified implementation limits:

- Network errors, HTTP 429, HTTP 5xx and Google's temporary rate-limit errors get
  four total attempts on the same key, with 4/8/16-second backoffs. Longer
  `Retry-After` values are respected.
- Quota exhaustion or invalid/restricted credentials skip that connection for
  the remainder of the run and try another. Credential rotation does not consume
  the transient retry budget.
- Exhausting transient retries fails the affected request; it does not rotate
  keys at that point. Affected channels retain previous metrics and receive a
  Failed status. No usable credentials means remaining requests cannot succeed.
- Skipped-key tracking is in memory for one run. There is no persistent quota
  cooldown or project-level quota grouping.

## Evidence

- Conversation and attached reply `chat-reply-2026-11-21_08-10-10.txt`, dated 2026-11-21.
- [Client and error handling](../../../packages/twenty-apps/internal/youtube-analytics/src/logic-functions/utils/youtube-client.ts).
- [Credential loading](../../../packages/twenty-apps/internal/youtube-analytics/src/logic-functions/utils/get-youtube-credentials.util.ts).
- [Native provider](../../../packages/twenty-apps/internal/youtube-analytics/src/connection-providers/youtube-connection.ts).
- [Merged PR #4](https://github.com/fundlevel-digital/twenty/pull/4).
