# 0007. Seed Sunny’s VM Preview From Live State

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: repository; Sunny preview
- Related: [0002](0002-preview-before-production-deployment.md)

## Context

Kareem is preparing Sunny CRM work, including potential PlusVibe changes, in a fresh Conductor cloud VM.

## Exchange

- 2026-11-22 Kareem: "Yo I wanna setup our Twenty CRM for sunny, I'll prolly do a bunch of stuff to do with the plusvibe app, so if we do tha tor any other stuff, just start up a preview on ur VM and do that stuff there."
- 2026-11-22 Kareem: "Start by copying our current live CRM state for the Sunny workspace 1:1 and spin up a preview"
- 2026-11-22 Agent: inspected the remote-preview runbook and prior rollout evidence, prepared Docker on the VM, and requested access to the deployment configuration through Conductor’s Mac command tool.

## Decision

Copy Sunny’s current live CRM state into an isolated VM preview and use that preview for subsequent work in this session. Preserve workspace records, installed apps, metadata, settings and uploaded files. This request authorizes reading production as the copy source; it does not request a production deployment.

## Why

Kareem explicitly requests a live-state copy and a VM preview for Sunny work.

## Consequences

Production access and fresh snapshot transfer are prerequisites. Runtime origins and integration execution need preview-local configuration so cloned credentials do not start production-facing background work.

## Evidence

The initial Mac access request timed out; the owner then said "go ahead" and the retry succeeded. A fresh production database and file copy was restored into the VM on the actual deployed image. All 40 Sunny data tables (122,464 rows) matched live content digests; all 244 copied files matched SHA-256 manifests. Backend health, preview password authentication and authenticated Companies browser rendering passed. Runtime routing and a preview-only owner password are intentional local differences. No production app or data changes were made. See the [handoff](../handoffs/2026-11-22-sunny-preview.md) for isolation and edge-verification limits.
