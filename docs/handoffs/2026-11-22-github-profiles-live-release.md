# GitHub Profiles Live Release — 2026-11-22

## Installed

[PR #25](https://github.com/fundlevel-digital/twenty/pull/25) merged as
`b13a4e000e116250658c74794c768e5e68f949e7`. Following the
[owner's deployment instruction](../decisions/github-profiles/0012-deploy-github-profiles-to-live-crm.md),
the exact merged app was installed in the existing live workspace through the
saved native CLI remote at `https://crm-login.fundlevel.co`.

The release used an isolated Mac checkout, immutable Yarn 4.18.1 dependencies,
SDK 2.59.0 and CLI 2.60.0. No preview fixture, customer records, preferences or
OAuth connection was copied into production. Production authentication remained
on the Mac. The existing local checkout and its unrelated work were preserved.

Installed content hash:
`af16847f4a385a9dcf282f30438281948aca43f94b95ab39eeb108174072c6e6`.

- Application: `46847040-3d5d-44c2-9d11-5e0392587ec3`.
- Registration: `d149177b-a20f-45f4-85c2-ba55a9adaf5f`.
- Reviewed and applied metadata: **330 creates, zero updates, deletions,
  destructive actions or cascades**.
- Follow-up native plan: **zero changes**.
- All 14 previous applications remain installed with the same IDs; GitHub
  Profiles is the fifteenth application.

Twenty requires registration before planning a new application. The native
registration and empty development installation were created first; the resulting
additive schema plan was reviewed before normal `app apply --no-prune` synchronized
it. Build, preview, installation, upload, sync, pull-base and client-generation
phases completed. No core image, server/worker environment, database reset,
infrastructure deployment or service restart was needed.

## Verification

The isolated release passed all **65 tests**, direct TypeScript checking and lint.
The standalone app's lint configuration inherits repository rules, so lint ran
against the exact release worktree using the same installed dependencies.

Native live metadata confirms three objects, five logic functions, three front
components, two commands and two source workflows. Extract Commit Emails is a
visible side-panel command, and its workflow action exposes the optional noreply
override with the label explaining that blank inherits the app default.

The app's source-field listing action executed successfully through the native
live runtime, returning 27 People field choices, 19 Company field choices and
the production callback URL. This verifies an app-role runtime and metadata read
without fetching GitHub profiles or changing customer records. Both People and
Company automatic sync are off, stale-link removal is off, and Skip GitHub
Noreply Emails is on. The new profile collection is empty. No backfill, commit
email extraction, GitHub account refresh or customer batch was started.

Public CRM health returned HTTP 200 before and after installation. The follow-up
plan and generated native client confirm synchronization and schema availability.
This release did not drive an authenticated production browser or newly verify
live avatar uploads or GitHub API calls; those app behaviors were verified in the
isolated preview as described in its [handoff](2026-11-22-github-profiles-preview.md).

The native connection-list endpoint rejects the CLI caller type with
PERMISSION_DENIED. No alternate credential extraction or endpoint bypass was
attempted, and no live connection-count claim is made. The provider's separate
readiness metadata is available and reports OAuth client setup incomplete.

## Remaining OAuth Setup

The live GitHub OAuth provider is installed, but its production client credentials
are **not configured**. The preview's connection was not promoted. The app itself
reports the exact live callback:

`https://crm-login.fundlevel.co/auth/apps/callback`

Configure `GITHUB_CLIENT_ID` and secret `GITHUB_CLIENT_SECRET` in
[GitHub Profiles developer configuration](https://crm-login.fundlevel.co/settings/developers/apps/d149177b-a20f-45f4-85c2-ba55a9adaf5f),
using a GitHub OAuth registration that accepts that callback, then connect GitHub
through the app's native connection settings. Enter secrets directly there, not
in chat. Live consent, token use, token refresh and multi-account waterfalling
remain unverified until that setup is completed. Optional personal-token
connections and anonymous access remain supported by the installed app.

Open [GitHub Profiles](https://crm-login.fundlevel.co/objects/githubProfiles) or
[its Sync preferences](https://crm-login.fundlevel.co/settings/app-preferences/46847040-3d5d-44c2-9d11-5e0392587ec3).
Review source mappings and sync modes before enabling automatic behavior or
planning a backfill.

Private release logs and metadata evidence remain in the isolated Mac release
directory referenced by that repository's ignored
`.context/github-profiles-live-release-path`. No secrets or customer record
contents are included here. Hindsight recall remained unavailable because the
private repository profile is missing; no remote retention is claimed.

## Publication Request

On 2026-11-22 Kareem requested "Create a PR" with instructions to publish the
complete workspace diff against `main`. This documentation PR records the
completed live installation and remaining OAuth setup; it changes no runtime
code and does not perform another deployment.
