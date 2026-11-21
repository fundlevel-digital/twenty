# Decisions: Twenty

Decision records and area indexes live under root `docs/decisions/`. Read the
relevant records before changing settled behavior. Follow the
[decisions skill](../.agents/skills/decisions/SKILL.md) for new records and
supersession. Operational instructions stay with their package or skill.

| Area              | Index                                                 |
| ----------------- | ----------------------------------------------------- |
| YouTube Analytics | [Decisions](decisions/youtube-analytics/DECISIONS.md) |
| PlusVibe | [Decisions](decisions/packages/twenty-apps/public/plusvibe/DECISIONS.md) |

This repository uses the centralized layout from
[fundlevel-digital/mono](https://github.com/fundlevel-digital/mono/blob/main/.agents/skills/decisions/SKILL.md).
The retrospectives cover the YouTube Analytics and PlusVibe work from their
2026-11-21 conversations; unrelated CRM Home changes are outside their scope.

## Repository Decisions

| # | Date | Decision | Status |
| --- | --- | --- | --- |
| [0001](decisions/0001-upstream-and-computed-field-editor.md) | 2026-11-21 | Update to official upstream main, retain fork computed features and reuse upstream's expression editor | accepted |
| [0002](decisions/0002-preview-before-production-deployment.md) | 2026-11-21 | Provide a production-seeded, isolated preview before the requested fork merge and deployment | accepted |
| [0003](decisions/0003-ruler-decisions-and-session-documentation.md) | 2026-11-21 | Adopt the existing Ruler/decisions conventions, document this session, and omit the preview skill | accepted |

Implementation and verification are summarized in the [session handoff](handoffs/2026-11-21-computed-fields-and-preview.md).
