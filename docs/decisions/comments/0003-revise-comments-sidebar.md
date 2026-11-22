# 0003. Revise The Comments Sidebar

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments

## Context

Kareem supplied a dark-mode screenshot of the preview sidebar. It showed a
repeated Comments heading, exposed checkbox filters, a Refresh button and an
unhelpful save error while no comments were loaded.

## Exchange

- 2026-11-22 Kareem: "Also this UI looks like shit"
- 2026-11-22 Agent: Treated this as a request to revise the sidebar against the original Attio references and Twenty's design rules, and investigated the failed load shown in the screenshot.

## Decision

Revise the Comments UI rather than retain the initial presentation. The existing
Attio reference remains the target; this message does not prescribe specific
components or approve an implementation design.

## Why

Kareem rejected the visual quality of the initial sidebar.

## Consequences

Implementation choices include a compact toolbar, native filter and options
menus, author avatars, relative timestamps, quieter thread actions, a smaller
composer and explicit load-error recovery. The sidebar now calls the existing
handler through metadata execution: the host fetch policy preserves page cookies
for metadata but deliberately excludes app routes, which blocked requests behind
the preview's Conductor sign-in gate. The app role requests the Workflows flag
required by this execution API. Target access and author checks remain in the
handler. Browser verification also found that the SDK document-element geometry
used the sidebar offset as the document origin. Correcting that origin prevents
floating menus from being shifted past the window edge; the component body
retains its scoped coordinates. The DOM polyfill also made document body, head
and html elements siblings of HTMLElement, so Floating UI skipped the scoped
containing block. Normalizing their prototype inheritance restores HTML layout
checks. The combined correction was verified in the running sidebar.

## Evidence

See the [app README](../../../packages/twenty-apps/internal/comments/README.md)
for the maintained verification and limits. Preview verification uses the actual
CRM side panel with seeded development records. No production changes are
included.
