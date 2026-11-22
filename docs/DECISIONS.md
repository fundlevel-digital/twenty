# Decisions: Twenty

Decision records and area indexes live under root `docs/decisions/`. Read the
relevant records before changing settled behavior. Follow the
[decisions skill](../.agents/skills/decisions/SKILL.md) for new records and
supersession. Operational instructions stay with their package or skill.

| Area | Index | Implementation And Handoff |
| --- | --- | --- |
| Better Lists | [Decisions](decisions/better-lists/DECISIONS.md) | [App README](../packages/twenty-apps/internal/better-lists/README.md), [Handoff](handoffs/2026-11-22-better-lists.md), [Live release](handoffs/2026-11-22-better-lists-live-release.md) |
| GitHub Profiles | [Decisions](decisions/github-profiles/DECISIONS.md) | [App README](../packages/twenty-apps/internal/github-profiles/README.md), [preview handoff](handoffs/2026-11-22-github-profiles-preview.md), [live release](handoffs/2026-11-22-github-profiles-live-release.md) |
| Comments | [Decisions](decisions/comments/DECISIONS.md) | [App README](../packages/twenty-apps/internal/comments/README.md) |
| Related Columns | [Decisions](decisions/related-columns/DECISIONS.md) | Frontend lookup picker, saved column paths and related-value displays |
| Cal.com | [Decisions](decisions/cal-com/DECISIONS.md) | [App README](../packages/twenty-apps/public/cal-com/README.md) |
| Slack Sync | [Decisions](decisions/slack/DECISIONS.md) | [Implementation](slack-sync.md) |
| LinkedIn Sync | [Decisions](decisions/linkedin/DECISIONS.md) | [App README](../packages/twenty-apps/internal/fundlevel-linkedin/README.md), [handoff](../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md) |
| YouTube Analytics | [Decisions](decisions/youtube-analytics/DECISIONS.md) | [App README](../packages/twenty-apps/internal/youtube-analytics/README.md), [handoff](../packages/twenty-apps/internal/youtube-analytics/HANDOFF.md) |
| Twitter Analytics | [Decisions](decisions/twitter-analytics/DECISIONS.md) | [App README](../packages/twenty-apps/internal/twitter-analytics/README.md), [handoff](handoffs/2026-11-22-twitter-analytics.md) |
| PlusVibe | [Decisions](decisions/packages/twenty-apps/public/plusvibe/DECISIONS.md) | [App README](../packages/twenty-apps/public/plusvibe/README.md) |
| NanoInfluencer | [Decisions](decisions/nano-influencer/DECISIONS.md) | [App README](../packages/twenty-apps/internal/nano-influencer/README.md), [Live release](handoffs/2026-11-22-nano-influencer-live-release.md) |

This repository uses the centralized layout from
[fundlevel-digital/mono](https://github.com/fundlevel-digital/mono/blob/main/.agents/skills/decisions/SKILL.md).
The retrospectives cover each area's 2026-11-21 conversation; their records
identify scope, decisions, implementation and verification limits.

## Repository Decisions

| # | Date | Decision | Status |
| --- | --- | --- | --- |
| [0001](decisions/0001-upstream-and-computed-field-editor.md) | 2026-11-21 | Update to official upstream main, retain fork computed features and reuse upstream's expression editor | accepted |
| [0002](decisions/0002-preview-before-production-deployment.md) | 2026-11-21 | Provide a production-seeded, isolated preview before the requested fork merge and deployment | accepted |
| [0003](decisions/0003-ruler-decisions-and-session-documentation.md) | 2026-11-21 | Adopt the existing Ruler/decisions conventions, document this session, and omit the preview skill | accepted |
| [0004](decisions/0004-defer-production-deployment.md) | 2026-11-21 | Defer production deployment after merging PR #8 | superseded by 0005 |
| [0005](decisions/0005-roll-out-six-sessions-to-live-crm.md) | 2026-11-21 | Roll out the six merged sessions to the live CRM | accepted |
| [0006](decisions/0006-connect-linkedin-after-the-rollout.md) | 2026-11-21 | Leave LinkedIn connection and dependent history migration for later | accepted |
| [0007](decisions/0007-require-autofilled-preview-login.md) | 2026-11-22 | Require autofilled demo email and password in every isolated preview | accepted |
| [0008](decisions/0008-reuse-native-twenty-ui-components.md) | 2026-11-22 | Reuse native Twenty components across host UI and SDK apps, with custom UI only for unsupported capabilities | accepted |

| [0008](decisions/0008-use-native-enum-fields-across-apps.md) | 2026-11-22 | Use native Select/Multi-Select attributes for enums and backfill earlier apps | accepted |

Implementation and verification are summarized in the [session handoff](handoffs/2026-11-21-computed-fields-and-preview.md).
