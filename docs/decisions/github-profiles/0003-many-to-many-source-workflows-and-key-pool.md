# 0003. Many-To-Many Source Workflows And GitHub Key Pool

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Initial App](0001-native-github-profiles-app-and-preview.md), [Preview Population](0002-populate-preview-from-live-influencers.md)

## Context

The preview already held profiles related to influencers. Kareem requested
configurable synchronization from existing People and Companies GitHub links,
backfill controls, and multiple credentials using the native connection pattern
already used by the YouTube app.

## Exchange

- 2026-11-22 Kareem:

  > Acc let's add one more thing; let's make the app create two other workflows:
  >
  > I want the GH profiles to also be linked to Companies and People; so when those values are updated, the porfiles can be autp created; this should be configurable, so like let me choose if/how I want any backfills, if we should auto-create, etc.
  >
  > Aslo, let me have the multi-api key auth with auth waterfalling like the YT app

- 2026-11-22 Kareem:

  > I think the Companies and people alr have gh links? So that's kinda what u can base it off of, but I do want the GH profiles to be able to be M2M to those two

- 2026-11-22 Agent: read-only live metadata inspection confirmed a GitHub Links
  field on People, but no dedicated GitHub field on Companies. Implemented a
  configurable source picker, with the existing People field as its default and
  no assumed Company mapping.
- 2026-11-22 Agent: installed and exercised the update in the isolated preview;
  did not install the app or modify records in production.

## Decision

GitHub Profiles must support many-to-many relations with both People and
Companies. Existing source links drive two native create/update workflows.
Automatic creation, synchronization behavior and backfills are configurable.
Multiple GitHub tokens use native encrypted API key connections and credential
waterfalling, matching the YouTube app's connection-management approach.
The existing many-profiles-to-one-influencer relation remains supported.

## Why

Kareem explicitly requested reuse of existing links, shared relations, control
over automatic creation/backfills, and multiple credentials. The request does not
assert that a suitable Company field exists; current metadata evidence controls
the default mapping. GitHub-specific throttling rules also require account-wide
quota handling and a shared cooldown for secondary limits.

## Consequences

Implementation choices, rather than additional owner decisions:

- Two native junction objects and bidirectional related-record paths preserve
  shared profiles. Pair indexes prevent duplicate relations; re-added links
  restore a soft-deleted pair.
- Automatic sync starts disabled. Each source independently chooses its field,
  link-only/create-missing/refresh behavior and optional stale automatic-link
  removal. Manual and other source records' relations are preserved.
- Explicit backfill previews make no GitHub requests. Runs checkpoint each
  record, can pause/resume/cancel, and delay work after rate-limit resets.
- Native workspace connections store tokens. The app deduplicates keys,
  skips invalid/exhausted credentials, groups primary cooldowns by GitHub account,
  and pauses all keys for secondary limits. Anonymous access is optional and
  never a silent fallback from configured failed keys.
- Jobs read saved settings rather than trusting a warm worker's stale environment.

## Evidence

The [app README](../../../packages/twenty-apps/internal/github-profiles/README.md)
maintains the data model, setup and operating behavior. The
[preview handoff](../../handoffs/2026-11-22-github-profiles-preview.md) distinguishes
source changes, native preview checks and production state.

Forty tests, package typecheck and lint passed. Native preview backfills completed
for both sources; Company updates auto-created a public demo profile and People
updates linked it alongside another profile. The same profiles were shared by
multiple demo source records. A soft-deleted relation was restored with its
original record ID. The original 35 profiles were preserved; one public vendor
demo profile was added for automatic-create verification, leaving 36 total.

Key waterfall, shared primary quotas, secondary throttles, retry scheduling and
failed-key anonymous fallback are covered by tests. No real GitHub token was
configured in this preview, so successful multi-token authentication against
GitHub itself is not claimed. The public automatic-create check used anonymous
GitHub profile/social calls and one avatar download. No paid API calls were made.
