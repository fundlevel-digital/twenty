# 0004. Use A Cloud Preview And Finish With Saved Data

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: LinkedIn
- Related: [area index](DECISIONS.md), [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)

## Context

The app needed runtime and migration checks without applying the rebuild to the
live CRM. Later, the provider reported an inactive subscription.

## Exchange

- 2026-11-21 Kareem: "Can u please do a twenty crm preview hosted on ur machine instead of deploying to my acc app? U can seed with our prod data/configs/secrets"
- 2026-11-21 Agent: built an isolated CRM clone in the cloud and encountered the inactive Unipile subscription during account/attachment checks.
- 2026-11-21 Agent: asked whether to restore the subscription or finish with saved data and simulated provider responses.
- 2026-11-21 Kareem: "Finish with saved data and simulated responses"

## Decision

Run the rebuilt CRM/app in the cloud preview, seeded from production. Finish
verification with saved records and simulated provider responses. Do not deploy
the rebuilt CRM/app to production as part of this task.

## Why

The preview makes the rebuild reviewable without a live CRM cutover. The owner
explicitly selected saved/simulated checks rather than restoring the provider.

## Consequences

Production database access for cloning was read-only. The preview has separate
session credentials, disabled outgoing mail/crons, no container default internet
route and a gateway that rejects real provider credentials. All 821 legacy
messages migrated. Six missing original attachment files are represented by
clearly labeled saved metadata files, not fabricated originals. The 237 messages
without an assigned human owner are held on a disabled technical archive account;
that quarantine was an implementation choice, not a human ownership decision.

## Evidence

Password login, settings, queued history, missed-webhook catch-up, deduplication,
contact policies, replies/read acknowledgements and signed webhook routing were
checked against the actual CRM with simulated provider data. Source reconciliation
is exact. Large pre-existing file uploads were excluded from the clone. The
Worker/D1 deletion in record 0003 is the explicitly authorized external exception.
