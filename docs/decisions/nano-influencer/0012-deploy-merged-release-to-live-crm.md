# 0012. Deploy The Merged Nano Release To Live CRM

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: NanoInfluencer
- Related: [Native Enum Fields](../0008-use-native-enum-fields-across-apps.md), [Workspace-Owned Linking](0011-workspace-owned-social-profile-linking.md)

## Context And Exchange

PR #28 merged as `a8ecf7ada1c366e67eee792a9aeb0125197f17d2`. Conductor's
attached handoff states: "The PR is merged, and you've been switched to a new branch conductor/untitled-v4 off origin/main."

Kareem: "OK, please deploy to live CRM .context/attachments/bjgQiB/Branch continued.md".

The agent verified the merge, current live image, existing native CLI remote
and production access retained on the Mac. The merged release requires the
host workflow input renderer as well as workspace app definitions.

## Decision

Deploy the merged release to the existing live CRM, install NanoInfluencer and
apply the included native enum upgrades and record backfills to installed target
apps. Preserve existing applications, records, connections, preferences,
infrastructure, domains and secrets. Keep LinkedIn's deferred migration stage.

## Scope And Verification

Use a successful pinned release image for server and worker and the existing
pgBackRest/restic offsite backup procedure before cutover. Do not create local
database dumps or upload archives. Native app plans must disable pruning and
retain populated categorical selections during backfill. Preview credentials,
connections and records are not production installation inputs.

Nano's safe installation defaults remain manual sync, no automatic People
creation and keep removed lists/memberships. Deployment does not authorize a
paid discovery batch, a provider history import or implementation of cross-app
profile-linking workflows. Installation, live verification and any remaining
connection setup will be recorded separately from this authorization.

## Evidence

The [live release handoff](../../handoffs/2026-11-22-nano-influencer-live-release.md)
records the deployed image, native app installation, backup checks and live
verification separately from this authorization.
