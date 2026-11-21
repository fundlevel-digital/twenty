# Slack sync decisions

Owner decisions for the Slack application, conversation views, test data and contact creation. Start with [the implementation guide](../../slack-sync.md) for current behavior and remaining limitations. Questions alone are not treated as approval; the records distinguish owner choices from agent implementation. Historical decisions retain their original dates and are listed chronologically.

| #                                                             | Date       | Decision                                                               | Status   |
| ------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- | -------- |
| [0010](0010-per-member-slack-user-connections.md)             | 2026-11-19 | Use per-member Slack user connections and conversation inclusion       | accepted |
| [0011](0011-initial-message-sharing-and-deletion-contract.md) | 2026-11-19 | Keep native sharing and distinguish internal from external deletions   | accepted |
| [0012](0012-keep-slack-branch-scoped.md)                      | 2026-11-20 | Keep this branch focused on Slack sync                                 | accepted |
| [0001](0001-slack-mvp.md)                                     | 2026-11-21 | Build a Slack MVP using Twenty’s native messaging                      | accepted |
| [0002](0002-app-image.md)                                     | 2026-11-21 | Use the supplied Slack app image                                       | accepted |
| [0003](0003-channels-threads-messages-and-files.md)           | 2026-11-21 | Expose channels, threads, messages and attachments                     | accepted |
| [0004](0004-record-slack-tabs-and-deleted-style.md)           | 2026-11-21 | Group record conversations by channel and soften deleted messages      | accepted |
| [0005](0005-real-channel-testing.md)                          | 2026-11-21 | Use the actual posthog channel for testing                             | accepted |
| [0006](0006-app-preferences.md)                               | 2026-11-21 | Put Slack controls in native App preferences                           | accepted |
| [0007](0007-readable-slack-text.md)                           | 2026-11-21 | Render Slack mentions and emoji as readable message content            | accepted |
| [0008](0008-contact-creation-and-employees.md)                | 2026-11-21 | Make contact creation configurable and exclude internal employees      | accepted |
| [0009](0009-native-preferences-ui.md)                         | 2026-11-21 | Replace the plain Slack preferences form with native settings controls | accepted |
| [0013](0013-open-slack-pull-request.md)                       | 2026-11-21 | Open the Slack work for review                                         | accepted |
