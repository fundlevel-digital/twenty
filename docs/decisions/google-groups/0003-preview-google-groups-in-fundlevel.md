# 0003. Preview Google Groups In Fundlevel

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Google Groups; workspace previews
- Related: [Initial Sunny copy](../0007-sunny-live-state-vm-preview.md), [Fundlevel handoff](../../handoffs/2026-11-22-fundlevel-google-groups-preview.md)

## Context

Google Groups and its contact policies were installed in the isolated Sunny preview. The earlier clone deliberately removed Fundlevel, so switching the app review to Fundlevel requires a separate workspace snapshot.

## Exchange

- 2026-11-22 Kareem: "can u preview the fundlevel workspace instead for this app; install it there on ur vm and stuff too"
- 2026-11-22 Agent: proposed restoring Fundlevel into a separate VM database and installing Google Groups while preserving Sunny and pausing integration jobs.

## Decision

Use Fundlevel for the Google Groups app preview. Copy its live state into the isolated VM and install the app there. Preserve the existing Sunny runtime and saved configuration. This does not request a production app installation, mail import or send.

## Consequences

Fundlevel gets a separate database, Redis, file store, server and restricted metadata worker. The same Conductor preview URL points to its gateway. Its runtime uses the current live image, which is newer than the image in the earlier Sunny preview. Google Groups starts with empty Group selections and processing paused. Reuse the preview's Google OAuth client settings; keep Google connections and Group preferences scoped to their original workspace.

## Evidence

See the [Fundlevel handoff](../../handoffs/2026-11-22-fundlevel-google-groups-preview.md) for snapshot checks, installation, browser verification, runtime recovery and remaining Google authorization steps. No production CRM record, app or deployment was changed.
