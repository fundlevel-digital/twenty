# 0008. Use Native Controls and Truthful Loading States

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: packages/twenty-apps/public/plusvibe
- Related: [Area Index](DECISIONS.md)

## Context

The first preference form used a raw browser checkbox/select and a wide Save
button. A screenshot also showed a load error alongside default values and a
Connect action, even though the actual connection had not loaded.

## Exchange

- 2026-11-21 Kareem, excerpt about the attached screenshot: "this looks bad"
- 2026-11-21 Agent: acknowledged both the visual mismatch and the misleading failed-load form; replaced it with native controls and a retry state.

## Decision

Use native Twenty cards, typography and controls in the actual parent page,
with Account first, clear spacing and immediate preference saving. On an initial
load failure, show Retry without unverified defaults or a false disconnected
account. Temporary route failures may retry once; denied access must not loop.

## Why

The screenshot showed that the earlier form did not meet the native UI pattern
requested through the LinkedIn comparison. A failure to read preferences must
not be presented as an invalid API key or a verified disconnected state.

## Consequences

The page now loads Twenty styles and follows the host color scheme. Ordinary
preference changes save immediately, with failure rollback; domain-list edits
later use a compact explicit Save Domains action. Navigation does not trigger a
status reload after leaving the page. Refresh failures use loading wording.

The original screenshot's exact failure did not reproduce. Three fresh status
loads succeeded; no definitive original cause was established. A later backend
stop was handled separately and is not asserted to explain that screenshot.

## Evidence

- Local commits `851ca740ef` and `a06a350af5` for UI/copy refinements.
- 126 app tests passed at this stage, including rollback and bounded retries.
- Actual light/dark parent pages had zero browser page errors. Injected temporary
  failures verified one retry, hidden unverified form and recovery via Retry.
- Current source and operating instructions: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Backfilled from the owner messages in this Conductor session and verified local
source/VM evidence. Quotes marked as excerpts preserve the selected original
text; agent interpretations are identified above. Local commits are evidence of
implementation, not a claim that they were merged or deployed to production.
