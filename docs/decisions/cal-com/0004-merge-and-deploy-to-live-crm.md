# 0004. Merge And Deploy To The Live CRM

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Cal.com
- Related: [0001](0001-oauth-app-and-isolated-preview.md), [0003](0003-per-connection-sync-preferences.md)

## Context

The app was tested in an isolated preview with OAuth, selected-link settings,
history imports and attendee-to-Person creation. The owner reviewed the preview
and the contact matching behavior.

## Exchange

- Agent: explained that an existing Person is matched by the first attendee's
  email, missing People are created only when enabled, and ambiguous matches
  remain unlinked.
- 2026-11-21 Kareem:

  > ok cool.
  >
  > Go ahead and merge and deploy to live crm

## Decision

Merge the Cal.com app into main and deploy it to the live Fundlevel CRM.
This supersedes the earlier preview-only deployment scope for this app.

## Why

Kareem explicitly authorized both merge and live deployment after preview review.

## Consequences

Deploy the production app source, preserving the live CRM's unrelated apps and
records. The Conductor-only proxy fixture is not part of production deployment.
OAuth client redirect registration and live account consent remain separate
external setup steps; deployment status must distinguish installation from a
connected and verified live sync. No core server image change is needed for this
SDK app release.

## Evidence

The release handoff records commit/PR, deployment plan and apply results,
verification, and any outstanding OAuth setup. Credentials stay outside Git.
