# 0010. Deploy Comments To The Live CRM

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Comments
- Related: [0007](0007-independent-comments-for-any-object.md), [0009](0009-shareable-inbox-selection-and-record-links.md)

## Context

PR #23 merged as `43c3a322390f6c7485e8c5cc9fc7eafb7a06bd88`. The owner
continued on a new branch and requested the live rollout after preview review.

## Exchange

- 2026-11-22 Kareem: "Okay, please deploy to live crm"
- 2026-11-22 Agent: verified the merged image build, existing live image pins,
  saved Fundlevel CLI session and the host's offsite backup procedure.

## Decision

Deploy the merged Comments release to the live CRM and install its app in the
existing Fundlevel workspace. Preserve other applications, database and Redis
services, volumes, domains and secrets. This does not resume OpenBot work.
There is no Better Lists or workspace 932 dependency.

## Consequences

The shared core image supplies the native Inbox integration and renderer fixes;
the workspace app supplies comments, commands and record tabs. No core server,
shared package or schema upgrade changed since the current live image. Use the
existing pgBackRest and restic offsite jobs with writes stopped before cutover;
do not create local database dumps or upload archives. Install with `--no-prune`.

The preflight found one member assigned to a role with global record read access
and no row-level predicates or rules. Self mentions do not notify. Restricted
recipient notification filtering remains a documented follow-up before using
mentions with additional restricted members; this rollout does not claim that
multi-member privacy validation is complete.

## Evidence

The [live release handoff](../../handoffs/2026-11-22-comments-live-release.md)
records the deployed core image, successful workspace installation, preserved
applications and services, pre/post offsite backups and authenticated read checks.
The rollout completed on 2026-11-22; no production test records or notifications
were created by verification.
