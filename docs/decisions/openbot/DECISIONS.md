# OpenBot Decisions

Standalone OpenBot app, bot identities and optional CRM integrations.

| #                                                        | Date       | Decision                                                                                                     | Status                                    |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| [0001](0001-bot-participants-and-vm-preview.md)          | 2026-11-22 | Build bot mentions and attributed replies, with an isolated VM preview                                       | accepted                                  |
| [0002](0002-managed-connection-and-agent-enrollment.md)  | 2026-11-22 | Require automatic connection setup and managed bot enrollment without manual routines                        | superseded by 0005                        |
| [0003](0003-workflow-actions-and-sender-secrets.md)      | 2026-11-22 | Approve Send/Get Status actions and account for sender-owned routine secrets                                 | accepted                                  |
| [0004](0004-pause-openbot-for-comments.md)               | 2026-11-22 | Pause OpenBot and preserve its source while standalone Comments is completed                                 | superseded by 0005                        |
| [0005](0005-resume-crm-with-manual-webhooks.md)          | 2026-11-22 | Resume CRM work using manually configured webhooks                                                           | accepted                                  |
| [0006](0006-bot-settings-and-task-assignment.md)         | 2026-11-22 | Build bot settings, task assignees and configurable task reminder workflows                                  | superseded in app ownership by 0007       |
| [0007](0007-standalone-app-and-shared-bot-identities.md) | 2026-11-22 | Make OpenBot a standalone app, with optional Comments integration and reusable bot identities                | accepted                                  |
| [0008](0008-native-external-assistants.md)               | 2026-11-23 | Add native external assistant registration, mentions and attributed replies while keeping OpenBot standalone | accepted                                  |
| [0009](0009-recipient-and-task-creation-gaps.md)         | 2026-11-23 | Complete bot recipients and draft Task assignment; correct secret-redacted reply setup                       | superseded in default reply setup by 0010 |
| [0010](0010-readable-request-reply-code.md)              | 2026-11-23 | Expose the scoped reply credential as `reply.code`; keep the helper optional and the legacy alias compatible | accepted                                  |
