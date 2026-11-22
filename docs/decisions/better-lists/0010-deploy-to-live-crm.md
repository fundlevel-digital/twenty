# 0010. Deploy Better Lists To The Live CRM

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [SDK app and selection commands](0008-register-sdk-app-and-selection-commands.md), [draft PR](0009-open-draft-pr.md)

## Context

PR #29 merged as `ea0a75d7565451ac61faedc8248ed5e96d67e2d2`. Conductor moved this workspace to a continuation branch after the merge.

## Exchange

- Kareem: ".context/attachments/8XPsP9/Branch continued.md Deploy to live CRM plz"
- Attachment: "The PR is merged, and you've been switched to a new branch conductor/untitled-v4 off origin/main."
- Agent: check the merged release build, current production image, existing offsite backups and member-scoped app installation before deploying and verifying the release.

## Decision

Deploy the merged Better Lists core release and install its SDK app in the existing Fundlevel workspace. Preserve existing applications, CRM records, database and Redis services, volumes, domains and secrets. Preview fixture lists and demo records are not production seed data.

## Consequences

Use a pinned successful image containing the merged release for server and worker, with the current image retained for rollback. Verify runtime source equivalence if subsequent merges advance the build commit. Use the host's existing offsite pgBackRest and restic backup jobs with application writes stopped before cutover; do not create local database dumps or upload backup archives. Install the app with no pruning. Keep production SSH access and saved CLI credentials on the Mac and production host.

The merged release adds runtime membership synchronization and parent guards without new core schema migrations. App installation creates its registration, role, components, menu and commands; native list metadata is created when the user creates lists. The [live release handoff](../../handoffs/2026-11-22-better-lists-live-release.md) records the successful cutover and installation separately from this authorization.

## Evidence

- [Implementation and preview verification](../../handoffs/2026-11-22-better-lists.md).
- [Previous live cutover](../../handoffs/2026-11-22-comments-live-release.md).
