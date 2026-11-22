# Decisions: YouTube Analytics

Native Twenty app, channel records, calculations, preferences and production rollout.

| #                                                     | Date       | Decision                                                                                                    | Status   |
| ----------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-native-api-key-connections.md)            | 2026-11-21 | Replace treg with native pooled API-key connections, after considering OAuth                                | accepted |
| [0002](0002-one-youtube-channels-object.md)           | 2026-11-21 | Store identities and analytics in one YouTube Channels object, with Title Case labels and supplied branding | accepted |
| [0003](0003-timeframe-columns-and-validated-tags.md)  | 2026-11-21 | Independent multi-timeframe counts/percentages, native columns and validated 1–366-day tags                 | accepted |
| [0004](0004-native-app-preferences.md)                | 2026-11-21 | Put Analytics controls in App Preferences, retaining workspace-wide calculation values                      | accepted |
| [0005](0005-production-migration-and-verification.md) | 2026-11-21 | Merge/deploy, migrate 90 enabled channels and verify fresh production calculations                          | accepted |
| [0006](0006-native-channel-profile-photos.md)         | 2026-11-21 | Use channel profile photos as native avatars and backfill all 90 channels                                   | accepted |

These records were written retrospectively on 2026-11-21 from this conversation,
its supplied handoff and source/deployment evidence. Quotes are the owner's actual
messages; agent entries summarize proposals and findings. Intermediate UI choices
within the exchange are historical, not current requirements.

- [App behavior and usage](../../../packages/twenty-apps/internal/youtube-analytics/README.md)
- [Current handoff and historical notes](../../../packages/twenty-apps/internal/youtube-analytics/HANDOFF.md)
- [Remote preview skill](../../../.agents/skills/twenty-remote-preview/SKILL.md)

[Repository decision 0007](../0007-use-native-enum-fields-across-apps.md) records the cross-app native enum field rule and backfill request.
