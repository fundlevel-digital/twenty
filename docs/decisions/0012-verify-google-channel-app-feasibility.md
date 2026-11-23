# 0012. Verify Google Channel App Feasibility In The Running Preview

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: repository; app feasibility verification
- Related: [0010](0010-sunny-live-state-vm-preview.md), [0011](0011-install-plusvibe-and-cal-com-in-sunny-preview.md)

## Context

The agent alternated between a core-change design and an app-only design based on source inspection. Kareem requested evidence rather than an untested feasibility claim.

## Exchange

- 2026-11-22 Kareem: "Can this be a just a Twenty CRM app or no?"
- 2026-11-22 Agent: described SDK app messaging capabilities and qualified native UI and permissions boundaries, without runtime verification.
- 2026-11-22 Kareem: "Can u please actually veirfy instead of guessing"
- 2026-11-22 Agent: installed a synthetic app in the isolated preview and exercised native channels, ingestion, shared-member reads, privacy redaction and send callbacks through real APIs.

## Decision

Ground the architectural answer in a working preview probe. Keep synthetic transport tests distinct from actual Google authorization, Group routing and email delivery. This authorizes verification, not a production deployment or a claim that the Google connector is complete.

## Why

Kareem explicitly rejected guessing as the basis for the answer.

## Consequences

A clearly labeled verification app, synthetic connection, synthetic contact and synthetic second member were added only to the preview. No Google API or email-delivery call is made by the probe. No core product source was changed.

## Evidence

The [preview handoff](../handoffs/2026-11-22-sunny-preview.md#runtime-verification-of-app-only-messaging) records passed checks, reproducible fixture locations and remaining limits. Installation alone is not treated as verification of real Google integration.
