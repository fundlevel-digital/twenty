# Decisions: PlusVibe

Owner decisions for the PlusVibe application in Twenty. Read this index before
changing its data model, connections, privacy, import behavior or preferences.

All records were backfilled on 2026-11-21. The app is now installed in production
with native message associations migrated and legacy fields retained. Source
Lead/history refresh and final pruning remain pending. See the
[rollout handoff](../../../../../handoffs/2026-11-21-live-crm-rollout.md) and
[repository decision 0005](../../../../../decisions/0005-roll-out-six-sessions-to-live-crm.md).

| #                                                                   | Date       | Decision                                                     | Status   |
| ------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ | -------- |
| [0001](0001-use-a-real-crm-preview-before-production.md)            | 2026-11-21 | Use a Real Twenty Preview Before Production                  | accepted |
| [0002](0002-group-sidebar-and-use-title-case.md)                    | 2026-11-21 | Group PlusVibe Objects and Use Title Case                    | accepted |
| [0003](0003-keep-source-leads-related-to-people.md)                 | 2026-11-21 | Keep PlusVibe Leads Separate and Related to People           | accepted |
| [0004](0004-use-owned-multiple-api-key-connections.md)              | 2026-11-21 | Use Multiple Member-Owned API-Key Connections                | accepted |
| [0005](0005-use-typed-fields-and-many-to-many-relations.md)         | 2026-11-21 | Use Typed Fields and Related Senders and Threads             | accepted |
| [0006](0006-show-each-message-without-quoted-history.md)            | 2026-11-21 | Show Each Message Without Repeated Quoted History            | accepted |
| [0007](0007-put-owned-sharing-preferences-in-apps-preferences.md)   | 2026-11-21 | Use Apps Preferences for Owned Import and Sharing Controls   | accepted |
| [0008](0008-use-native-controls-and-truthful-loading-states.md)     | 2026-11-21 | Use Native Controls and Truthful Loading States              | accepted |
| [0009](0009-apply-email-creation-policies-and-exclude-employees.md) | 2026-11-21 | Apply Email Creation Policies and Exclude Internal Employees | accepted |

Current setup and implementation: [PlusVibe README](../../../../../../packages/twenty-apps/public/plusvibe/README.md).

Record 0005 explicitly identifies an unresolved interpretation of the second
thread endpoint. Records 0001 and 0007 preserve the pending production migration
boundary. Record 0009 refines the creation controls introduced under 0007.

[Repository decision 0007](../../../../../decisions/0008-use-native-enum-fields-across-apps.md) records the native enum correction and backfill request.
