# 0002. Isolated VM Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments

## Context

The Comments app was implemented and packaged, but had not been installed in a running CRM.

## Exchange

- 2026-11-22 Kareem: "Can u setup a preview on ur vm and give me the link pl"
- 2026-11-22 Agent: Started an isolated Twenty preview with development seed data and planned installation of the Comments app before sharing the link.

## Decision

Run a preview of the Comments app on this workspace's VM and share its Conductor preview URL.

## Why

Kareem requested a running preview to try the feature.

## Consequences

Use an isolated development database and demo records. This request does not authorize production deployment or copying production CRM data. Private runtime configuration and preview links remain outside tracked documentation.

## Evidence

Final setup and verification are recorded in the [Comments app README](../../../packages/twenty-apps/internal/comments/README.md). Runtime logs and private preview configuration live in the ignored `.context/` directory.

## Verified Preview Progress

The app was installed into a new development database seeded with the light demo dataset. Backend and frontend proxy health checks passed. Authenticated live checks verified comment persistence, replies, resolve/reopen and notification visibility in the recipient's Inbox. Browser login and the source record loaded; sidebar verification was still in progress when the source snapshot was shared with the OpenBot workspace. No production deployment or CRM data copy occurred.

Subsequent browser verification opened Comments from the record command menu and checked emoji comment creation/persistence, author deletion and user mention selection. The browser tested the same origin through VM-local TLS, bypassing Conductor's sign-in gate. Server, worker and frontend remain supervised while the VM is running; no VM wake mechanism was added.
