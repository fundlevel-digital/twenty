# GitHub Profiles

Native Twenty app for GitHub account details, social accounts and raw API
responses. It adds **GitHub Profiles**, a **Refresh GitHub Profile** record
command, the **Fetch GitHub Profile** workflow action, and two configurable
workflows for existing People and Companies GitHub links.

## Data Model

An influencer has many GitHub Profiles; each profile belongs to at most one
influencer. The app references the existing Influencer object, universal ID
`b50d1a77-2489-4795-aa30-e55a1b14c6e9`; install it in a workspace that already
contains that object. The app does not create or import influencers itself.
Deleting an influencer clears the relation without deleting its profiles.

People and Companies each have a many-to-many relation with GitHub Profiles.
The app uses native **GitHub Profile Person Relations** and **GitHub Profile
Company Relations** junction objects and related-record paths in both directions.
One profile can belong to several people and companies; each person or company
can link several profiles. Unique profile/source pairs prevent duplicates.
Removed pairs are restored if their link is added again. Deleting a source or
profile cascades its junction rows. The profile's **Company** text field remains
GitHub's free-text account company, separate from its Companies relations.

GitHub ID is unique. Refreshing finds an existing profile by that immutable ID,
so a username change does not create a second record. Supplying a profile record
ID also guards against replacing it with a different GitHub account.

Fields include name, login, GitHub ID, node ID, profile/API/website URLs, email,
hireable, bio, location, company, site admin, account type, public repository and
gist counts, follower/following counts, Gravatar ID, avatar URL and native avatar.
GitHub Created At and GitHub Updated At preserve the source account timestamps;
Twenty's own Created At and Updated At retain their normal meaning.

All 13 social providers have native Links fields: Bluesky URL, Facebook URL,
Generic URL, Hometown URL, Instagram URL, LinkedIn URL, Mastodon URL, NPM URL,
Reddit URL, Threads URL, Twitch URL, Twitter URL and YouTube URL. Repeated links
for one provider use that field's secondary links. Removed links are cleared on
refresh. Unknown providers remain available in the raw response.

Raw Profile Response and Raw Social Accounts Response are native JSON fields.
Undocumented API properties are preserved. Social arrays are sent to Twenty as
JSON text because its normal input transformation changes an empty array to
null; GraphQL and the UI read the field back as the original array, including
`[]`. Nullable values remain null; the native Emails field displays an absent
email as empty while the raw response retains null.

GitHub avatars are imported into a single-value Files field used as the record
image. Downloads accept only the GitHub avatar host and enforce a 2 MB limit.

## Fetch Action

In a workflow, add **GitHub Profiles → Fetch GitHub Profile**. Inputs:

| Input | Meaning |
| --- | --- |
| `username` | GitHub username or profile URL; required for a new profile. |
| `githubProfileId` | Optional existing Twenty GitHub Profile record ID. With no username, refreshes its saved Username. |
| `influencerId` | Optional existing Twenty influencer record ID. Omit to preserve the existing relation. |

Outputs are `githubProfileId`, `login`, `profile` and `socialAccounts`. The latter
two contain the complete parsed API responses. Profile fields are also declared
in the workflow output schema for downstream variable selection.

The authenticated `POST /s/github-profiles/fetch` route accepts the same inputs.
The record command refreshes selected profiles sequentially and reports failures.
Enter Username before refreshing a manually created profile.

The action requests `/users/{username}` and paginates
`/users/{username}/social_accounts`. It validates both responses before saving,
reports GitHub failures and rate limits, and leaves existing profile data intact
if fetching or importing the avatar fails. Commit email extraction is a separate action described below.

Only information returned by those requests is available; location stays free
text and a missing email is not inferred. There is no periodic full refresh. Commit email extraction runs only when explicitly invoked.

## Commit Email Extraction

Select GitHub Profile records and run **Extract Commit Emails**, or add
**GitHub Profiles → Extract GitHub Commit Emails** to a workflow. Supply either
`githubProfileId` or the username/profile URL of an existing CRM profile. An
optional `maxPages` accepts 1–10 (default 10), with 100 commit results per page.
Fetch/refresh the profile first if its immutable GitHub ID is missing.
The record command opens a native side panel to review selected profiles, choose
the page limit and choose Use App Default, Skip Noreply Emails or Include Noreply
Emails before running. Opening the panel does not start extraction.

**Commit Emails** is a separate native Emails column. It excludes the live public
GitHub email and all email values already stored in the profile Email/raw profile
fields. It never overwrites those fields or the raw profile/social responses.
Addresses are validated and deduplicated without changing plus tags. Previously
sourced commit-only emails are retained for the same GitHub ID, unless they now
appear in profile data. **Skip GitHub Noreply Emails** in App Preferences →
GitHub Profiles → Sync defaults to on, including when upgrading older saved
settings. It excludes addresses ending in `@users.noreply.github.com`, regardless
of case, from both new results and previously extracted addresses on the next
successful scan. Saving the default alone does not modify existing records.
Workflow/API input `skipNoreplyEmails` overrides the app setting: omit it to
inherit, `true` skips and `false` includes. Explicit false remains an override
even when the app default is on. Other email domains are unaffected. These are
commit metadata, not verified or necessarily deliverable contacts.

The action searches `author:USERNAME is:public`, newest author date first, and
accepts an address only when the returned commit's linked author ID matches the
profile. Other authors, unlinked authors and private results are skipped. It does
not extract committers or arbitrary addresses mentioned in commit messages.

GitHub exposes at most 1,000 search results per query and may return incomplete
results. **Commit Email Scan Status** distinguishes Search Complete, Partial
Search, Failed and Rate Limited. The scan note explains caps/incompleteness;
Search Complete covers the returned indexed public search, not every repository
or branch. **Commit Email Sources** keeps sample commit URLs and coverage metadata,
while **Commit Records Scanned** and **Commit Email Scanned At** track the scan.
Failures preserve previous emails, evidence and successful scan timestamp.

Workflow outputs include `githubProfileId`, `login`, `emails` (all stored
commit-only addresses), `newEmails`, `status`, scanned/reported counts, skipped
counts and `note`. Downstream workflows can branch on `status` before treating
results as complete. The authenticated endpoint is
`POST /s/github-profiles/commit-emails`; native commands use metadata execution.
Outputs also include the effective `skipNoreplyEmails` policy and
`skippedNoreplyEmails` count for the current scan.

Search uses the existing OAuth-first credential pool. GitHub ordinarily permits
30 authenticated search requests/minute, separate from the regular REST budget.
The client keeps those cooldowns separate by GitHub user, preserves secondary
throttle protection and reports reset times. The command processes explicit
selections sequentially, reports failed profiles and does not silently downgrade
to anonymous access. It does not automatically extract emails on profile refresh
or run an existing-record batch.

See [GitHub's search limits](https://docs.github.com/en/rest/search/search).

## Source Workflows And Backfills

Open **App Preferences → GitHub Profiles → Sync**. These are shared workspace
preferences; managing them and backfills requires native Applications and Workflows permissions.

1. Select the existing GitHub source field independently for People and Companies.
   Text fields accept usernames or profile URLs; Links fields include their
   primary and secondary links. Repository URLs and other hosts are rejected.
   Domain fields are excluded because Twenty removes their URL paths.
2. Choose **Link Existing Profiles Only**, **Create Missing Profiles**, or
   **Create and Refresh Profiles** for each source.
3. Enable automatic sync independently, then **Save Sync Settings**. Automatic
   sync starts disabled. Saving never starts a backfill.
4. Optionally enable removal of automatic relations that disappear from the
   source field. Manual relations and other source records' relations are kept;
   invalid source values prevent cleanup. Profiles themselves are never removed.
5. For existing records, choose the source and behavior under **Backfills**,
   choose **All Records** or set a scan limit (1–5,000, default 500), then **Save Sync Settings** and **Preview Backfill**. Scan size and backfill behavior are saved separately for People and Companies. The paged preview
   scans in background pages and reports matching records, unique profiles, invalid values and a request
   estimate without contacting GitHub. Review it before **Run Backfill**.
   Progress is checkpointed per record; use Pause, Resume or Cancel as needed.
   A changed configuration requires a new plan, and records whose links changed
   since preview are skipped. Scan-limit truncation is shown explicitly.

The People default targets the existing `pdlGithubUrl` field by universal ID.
A fresh read-only inspection found that field on live People but no dedicated
GitHub field on live Companies. Companies therefore starts with no source
selected. Pick whichever existing field actually contains those links; the app
does not create or overwrite a source field.

**Refresh Profiles** re-fetches the latest GitHub details, email, social links,
counts and avatar into the same profile record. Current GitHub values replace
its GitHub-derived fields; People, Company and Influencer relations are preserved.
There is no scheduled polling or recurring refresh by default. Fetch/refresh
commands and workflow actions update profile data when run. Automatic source sync
only refreshes existing profiles in Create and Refresh mode, and skips unchanged
source updates. Commit email extraction runs separately through its command or
workflow action; refreshing a profile does not search commits.
With automatic-link removal off, source URL changes add new relations while
retaining previous ones. Link-only mode requires the new profile to exist already.

The app installs **Sync GitHub Profiles from People** and **Sync GitHub Profiles
from Companies**. Each native database-event workflow runs on created/updated
records, checks its configured switch, and queues **Sync GitHub Profiles from
Record**. Jobs read the latest saved configuration, re-read current source values
and skip unchanged automatic updates. Profile creation deduplicates by immutable
GitHub ID without changing existing influencer or shared-source relations.

The authenticated backfill endpoint is `POST /s/github-profiles/backfill`.
Supported actions: `fields`, `latest`, `plan`, `start`, `pause`, `resume`,
`cancel`, and `status`. Plan accepts `sourceType` (`person` or `company`),
`mode` and `limit` (`null` for All Records); controls/status accept `planId`.
Front components invoke the same function through native metadata execution.
The sandbox omits auth-proxy cookies on `/s/` routes, so UI controls use the
authenticated metadata bridge instead. A failed initial load blocks editing
and offers Retry, without displaying field UUIDs.

## Authentication And Rate Limits

The Sync page shows connection status and opens native connection management.
It reports OAuth setup as pending until an administrator has configured it;
registration instructions and callback details belong to this developer guide.

**OAuth is preferred.** Register a GitHub OAuth app at
[GitHub Developer Settings](https://github.com/settings/applications/new).
Use your Twenty origin followed by `/auth/apps/callback` as the callback URL;
derive the origin from the instance where the app is installed. Set
`GITHUB_CLIENT_ID` and secret `GITHUB_CLIENT_SECRET` under **Settings → Developers
→ Apps → GitHub Profiles → Config → Server Variables**. This is a one-time
administrator setup, separate from Twenty's OAuth registration for clients
connecting to Twenty itself. Then add **GitHub OAuth** connections under
**Settings → Apps → GitHub Profiles**. Multiple accounts are supported.

The app uses Twenty's native encrypted OAuth connections, PKCE/state and token
lifecycle. It requests no additional scopes: public profile access is sufficient.
See [GitHub's OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).

Personal access tokens are optional. Open **GitHub Settings → Developer Settings
→ Personal Access Tokens → Fine-Grained Tokens → Generate New Token**. Choose
an expiration and Public Repositories, leaving additional account/repository
permissions unset. Copy the token into a **GitHub Personal Access Tokens**
connection in this app's workspace settings. Token instructions are available on demand on the Sync page. See [GitHub's token instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
Existing API-key connections retain their identifiers. The legacy `GITHUB_TOKEN`
secret remains a final fallback. OAuth connections are tried before personal tokens.

Requests use usable, deduplicated connection tokens in order, falling through invalid or
primary-quota-exhausted keys. Account identities are cached by token fingerprint;
keys for the same GitHub user share the same quota cooldown. More keys for one
account do not increase its allowance. Tokens never appear in app errors or KV
keys. Anonymous access is optional and used only when no keys are configured;
configured failed/exhausted keys never silently fall back to anonymous access.

GitHub normally allows 60 unauthenticated REST requests/hour per IP and 5,000
personal-token requests/hour per user. A profile fetch needs at least two calls,
plus pagination, initial key identity checks and an avatar download. See
[GitHub's rate-limit documentation](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

The client honors primary reset headers and persists account cooldowns. Secondary
limits and Retry-After pause all keys with a minimum 60-second, exponential
cooldown; they do not cause key rotation. Network/5xx errors get three bounded
attempts. Backfill and automatic jobs reschedule after rate-limit resets rather
than holding a function open, and retry transient job failures with a bounded
count. Backfills expose their waiting time/error and can be paused. Automatic
jobs stop after 24 rate-limit deferrals. Direct Fetch/Refresh actions report the
reset time instead of automatically queuing a later refresh.

## Development

From this directory:

```bash
yarn install --immutable
yarn typecheck
yarn test
yarn lint
yarn twenty app build --path .
yarn twenty --remote preview app plan --no-prune --path .
yarn twenty --remote preview app apply --no-prune --path .
```

For a first installation, use `app apply --create --no-prune` after selecting the
intended isolated workspace. SDK discovery requires default exports on definition
files; reusable handlers and utilities use named exports.

See the [preview handoff](../../../../docs/handoffs/2026-11-22-github-profiles-preview.md)
for verification and the preview-only upload routing adjustment.
