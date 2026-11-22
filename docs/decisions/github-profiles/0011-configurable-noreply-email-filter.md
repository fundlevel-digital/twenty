# 0011. Configure GitHub Noreply Email Filtering

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: GitHub Profiles
- Related: [Commit Email Extraction](0010-commit-email-command-and-workflow.md)

## Exchange

- 2026-11-22 Kareem: "Make it so that there's a setting to skip `@users.noreply.github.com` emails, like `583231+octocat@users.noreply.github.com`"
- 2026-11-22 Kareem: "there should be default setting for the app, but also preferably configurable in the command/workflow config/settings"
- 2026-11-22 Agent: default skipping to on; let individual command/workflow runs
  inherit the saved default or explicitly skip/include. This default value is an
  implementation choice, not an explicitly specified owner value.

## Decision

Add an app-wide noreply email filter with per-run command and workflow overrides.
This replaces the prior unconditional retention of GitHub noreply commit emails.

## Implementation

- Saved app setting Skip GitHub Noreply Emails defaults to on; older settings
  inherit that default without changing People/Company sync preferences.
- Workflow/API `skipNoreplyEmails` is optional: omitted inherits the current saved
  app setting; true skips and false includes. Return the effective policy and
  skipped commit count, and record the policy in scan evidence.
- The native record command opens a side panel using shared Twenty controls.
  Select Use App Default, Skip Noreply Emails or Include Noreply Emails and a page
  limit, then run explicitly. This does not change the saved app default.
- Match the exact email domain case insensitively. On a successful filtered scan,
  remove previously collected matching addresses as well as skipping new ones.
  Merely saving preferences does not run a cleanup batch. Failures preserve
  previous results; profile Email and both raw response fields stay untouched.

## Scope

Source changes and the isolated preview only. Production remains unchanged.
Verification is recorded in the [handoff](../../handoffs/2026-11-22-github-profiles-preview.md).
