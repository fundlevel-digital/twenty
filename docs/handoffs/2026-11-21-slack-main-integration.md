# Slack Main Integration — 2026-11-21

The owner requested merging remote main into `fundlevel/slack-sync-app`, resolving conflicts, committing and pushing. Main was fetched at `a691dd35aa6db0df6315bd4555b9bbb038fa0fc1` (Twenty 2.61). The existing review artifact is draft [PR #10](https://github.com/fundlevel-digital/twenty/pull/10). [Decision 0014](../decisions/slack/0014-integrate-main-and-push.md) records the authorized scope. The [Slack guide](../slack-sync.md) documents the feature; [the earlier handoff](../../handoff.md) retains implementation history.

## Conflict Resolutions

- Retain main's canonical Ruler setup, regular generated `AGENTS.md`/`CLAUDE.md`, pinned wrapper script, Twenty-specific decisions skill and documentation for other applications. Add Slack links and provenance without replacing those areas. Generate instructions from `.ruler` sources.
- Combine Slack's safe text, raw-copy actions and deleted-message styling with main's `ChatMessageBubbleContent` metadata layout.
- Retain provider visibility and per-subscriber isolation while adopting the relocated database event enum, `CommonQueryParser`, structured field selection and readable-field restrictions. Minimal subscription invalidations retain the new required event ID.
- Combine upstream repository event fixtures/tests with Slack row-visibility fixtures/tests. Keep main's complete root package manifest and lockfile.

## Upgrade Commands

The feature's unmerged 2.60 commands move to the current `2-61` directory with fresh epoch timestamps greater than main's existing commands. Historical 2.60 commands match main. The existing SQL operations are preserved; this integration does not run migrations against the preview or production.

- `2-61-workspace-command-1795281277518-add-message-provider-metadata.command.ts` adds native Message provider metadata.
- `2-61-instance-command-fast-1795281277521-add-cross-connection-deduplication.ts` adds the provider deduplication flag.
- `2-61-instance-command-fast-1795281277523-add-app-conversation-bindings.ts` adds provider channel-object and message-folder record bindings.

Command-name constants, entity upgrade markers, instance registration and the 2.61 module point at these commands. The corresponding schema operations were previously verified on the isolated 2.60 preview; their 2.61 registration is checked here, without claiming a fresh 2.61 database upgrade test.

## Fresh Validation

All 330 focused tests pass: 77 Slack app, 127 native server across 21 suites, 46 frontend across seven suites, 71 CLI manifest and 9 SDK provider tests. This includes subscription privacy/invalidation, repository events and provider visibility, ingestion, contact creation, folder bindings and message rendering.

Shared barrels, Vite bundles and TypeScript declarations were rebuilt directly using the package's build commands after Nx project-graph initialization stalled. App typecheck/lint and the scoped frontend typecheck pass. The expanded scoped server typecheck reports four diagnostics in unchanged main files: missing semver declarations in two files and error `status` typing in two files. These checks do not establish that the full monorepo passes typechecking.

## Preview And Deployment State

The existing frontend/backend/worker use an isolated detached worktree at `eb3aaf6691`, the last verified 2.60 preview source. Matching pre-merge build artifacts, local configuration and existing storage were preserved under gitignored `.context`. The merged source and its rebuilt shared artifacts are separate from that preview. Do not treat existing preview behavior as verification of the merged 2.61 runtime.

The live CRM is unchanged. Native Slack OAuth, live events, membership changes, the target-instance upgrade and production deployment remain outstanding. Keep the PR draft pending review and runtime verification. No Slack messages or reactions were sent as part of integration.

## Documentation Follow-Up

While the first integration commit was being pushed, main advanced to `4e434b3e29ea0df562b10f088308635b5d66ee6e`. A second merge retains its new repository decision 0004 and production-deployment deferral handoff alongside the Slack index entry. This follow-up changes documentation only; the validated application code and upgrade commands are unchanged.
