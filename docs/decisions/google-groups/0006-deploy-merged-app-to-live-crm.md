# 0006. Deploy The Merged App To The Live CRM

- Date: 2026-11-23
- Status: accepted
- Decided by: Kareem
- Area: Google Groups; live Fundlevel workspace
- Related: [PR #37](https://github.com/fundlevel-digital/twenty/pull/37), [inbox preview](0005-preview-native-group-inbox-views.md)

## Context

The Google Groups app, generic native inbox view and operational documentation
merged in PR #37 as `b39ad2d1c5d4e0f9b2b28fc8099c55902eeecef1`.
The owner then requested live deployment.

## Exchange

- 2026-11-23 Kareem: "please deploy to live crm .context/attachments/W2wja0/Branch continued.md"
- 2026-11-23 Attached continuation: "The PR is merged, and you've been switched to a new branch conductor/untitled-v4 off origin/main."
- 2026-11-23 Agent: proposed installing the exact merged app in Fundlevel through
  the existing Mac live CLI remote, reviewing an additive plan and preserving
  existing apps and objects.
- 2026-11-23 Kareem: "Create a PR .context/attachments/sLFoUi/PR instructions.md"
- 2026-11-23 Agent: publishes the completed deployment record and setup handoff
  in a documentation-only PR against `main`.

## Decision

Deploy the merged Google Groups SDK app to the live Fundlevel CRM. Keep preview
mail, Google credentials, connections and preferences in the isolated preview.
Use a fresh live registration and the app's empty, paused defaults. Installation
alone does not authorize an outbound email, live backfill or workflow activation.

## Consequences

The app can be installed without a host image rollout because PR #37 changes
only app source and documentation. Production CLI credentials remain on the Mac.
Use no-prune installation and verify existing native app/object identifiers and
a zero-change follow-up plan. Production Google consent and Group selections
remain explicit configuration steps.

## Evidence

The [live-release handoff](../../handoffs/2026-11-23-google-groups-live-release.md)
records the installed artifact, 37 additive metadata creates, preservation of all
18 previous apps and 90 objects, zero-change follow-up plan, validated assets
and the read-only paused settings check. Google consent and live import remain
unconfigured; no production mail was read or sent.
