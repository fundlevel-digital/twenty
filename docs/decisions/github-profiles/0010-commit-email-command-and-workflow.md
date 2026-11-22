# 0010. Extract Commit Emails Into A Separate Column

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Native App](0001-native-github-profiles-app-and-preview.md), [Authentication](0005-oauth-and-clear-per-object-backfills.md)

## Exchange

- 2026-11-22 Kareem, replying to the GitHub CLI command that searches commits by
  `author:USERNAME` and deduplicates `.commit.author.email`:
  "Ok cool; can u please add a command and workflow stuff to do this?"
- 2026-11-22 Kareem:
  "Extracted emails that aren't in the gh profile data should do into a separate col"
- 2026-11-22 Agent: add a selected-record command and workflow action, with
  commit-only addresses in a dedicated native Emails field. Preserve the profile
  Email and original API responses. Report partial search coverage explicitly.

## Decision

Provide Extract Commit Emails as a GitHub Profiles record command and Extract
GitHub Commit Emails as a workflow action. Store extracted addresses absent from
profile data in a separate Commit Emails column.

## Implementation Choices

- Use the existing OAuth-first pool for public commit search. Check each commit's
  linked GitHub author ID against the profile's immutable GitHub ID; omit private,
  unlinked and other-account commits. Validate email syntax, deduplicate case
  insensitively and exclude current/live and saved profile email values.
- Preserve previously sourced commit-only emails for the same immutable account,
  merging new evidence and excluding addresses now present in profile data.
- Save search status, scan timestamp/count, coverage notes and up to three sample
  commit URLs per email. Do not overwrite profile Email, raw profile/social JSON,
  CRM relationships or successful extraction results after request failures.
- Search at most ten pages of 100 results. Lower configured page limits,
  GitHub's 1,000-result ceiling and incomplete-result flags produce Partial Search.
  Search Complete means the returned search was exhausted, not that every commit
  in every branch/repository was scanned.
- Track search quota separately from ordinary REST quota for each GitHub account.
  Secondary throttles still pause all credentials. Direct actions report reset
  times and retain prior results; this feature does not start a background batch.

## Source And Scope

[GitHub search API](https://docs.github.com/en/rest/search/search) documents the
1,000-result ceiling, incomplete-result flag and separate search rate limit.
The app does not verify email deliverability or ownership from commit metadata.
No private repository access or GitHub email permissions are requested.
Implementation and isolated-preview verification are maintained in the
[README](../../../packages/twenty-apps/internal/github-profiles/README.md) and
[handoff](../../handoffs/2026-11-22-github-profiles-preview.md). No production
installation, customer extraction batch or production write is implied.

## Verification

On 2026-11-22, all 60 app tests, direct package typecheck and lint passed. The
isolated preview executed the action through native OAuth, completed a draft
workflow using it, and ran the native record command in a browser without page
errors. The command scanned 1,000 indexed public commit records on the public
Octocat demo and correctly reported Partial Search. Readback confirmed that the
three stored commit-only addresses excluded profile emails, while profile Email
and both raw API response fields were unchanged. No customer batch was run.
