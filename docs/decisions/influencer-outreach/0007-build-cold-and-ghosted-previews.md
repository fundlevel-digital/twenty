# 0007. Build Cold And Ghosted Previews

- Date: 2026-11-23
- Status: superseded by 0008
- Decided by: Kareem
- Area: Influencer Outreach
- Related: [Requirements](0002-cold-and-ghosted-workflows.md), [Sequencer Scope](0006-standard-sequencer-scope.md)

## Context

Kareem requested visual previews after discussion of stage definitions and
possible dashboard groupings.

## Exchange

- 2026-11-23 Kareem: "Just make the previews and show me"
- 2026-11-23 Agent: built interactive Cold and Ghosted concepts using native Twenty UI components and fictional sample data.

## Decision

Build and show the two dashboard previews so Kareem can review concrete layouts.
This authorizes preview implementation, not approval of every proposed layout,
CRM stage changes, new sequencing automation or production deployment.

## Why

Kareem explicitly requested previews instead of further requirements questions.

## Consequences

Implemented a standalone preview in
[`influencer-outreach-preview`](../../../packages/twenty-apps/internal/influencer-outreach-preview/README.md).
Cold includes summary filters, contact coverage, rounds and POC details. Ghosted
includes both follow-up count scopes, conversation context, inbox history,
historical inbox activity/access and an illustrative thread excerpt. Search,
sorting, empty/reset states, light/dark mode and narrow-screen details work.

All data is fictional. The preview is isolated from live CRM configuration and
providers. LinkedIn history is explicitly absent. The sample counting window
is a prototype assumption, not a new owner-approved rule. No host code changes,
SDK installation, emails or enrollments were performed.

## Evidence

- Direct TypeScript check and production Vite build passed.
- Browser interaction checks passed against the development preview and built static preview: Cold filters/search/reset, POC details, Ghosted counts and inboxes, inbox sorting, sample thread, table filtering/sorting, Escape/close, theme switching, mobile layout and direct Ghosted URL. No browser errors remained.
- Screenshots are under ignored `.context/outreach-*.png`.
- Conductor registered port 3001 at `https://fundlevel-w939.conductor.show/`. Anonymous access receives the expected workspace sign-in gate; authenticated edge access was not tested. The built app was checked locally.
- A detached Python static server serves `dist`; task process metadata and logs are under ignored `.context/`. It survives tool completion; VM shutdown/wake recovery was not verified.
- Hindsight was unavailable earlier in this session; no remote retention is claimed.
