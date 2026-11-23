# Decisions: LinkedIn

Fundlevel's LinkedIn app, its native messaging rebuild, privacy and preview cutover.
Records were backfilled on 2026-11-21 from the supplied Claude transcript and this
Conductor conversation. Historical transcript timestamps are retained where
available; current exchange dates use this session's date. Agent implementation
choices are identified separately from Kareem's decisions.

| # | Date | Decision | Status |
| --- | --- | --- | --- |
| [0001](0001-keep-our-app-and-use-native-messaging.md) | 2026-11-21 | Keep LinkedIn Sync, adopt native messages and member connections, migrate before retiring legacy objects | accepted |
| [0002](0002-configurable-workspace-connection-sharing.md) | 2026-11-21 | Connections are shared workspace-wide by default, with configurable privacy | accepted |
| [0003](0003-drop-and-delete-the-archive-worker.md) | 2026-11-21 | Simplify by dropping D1 and delete the deployed archive Worker/database | accepted |
| [0004](0004-cloud-preview-and-simulated-provider-checks.md) | 2026-11-21 | Rebuild in a cloud CRM preview and finish using saved data and simulated provider responses | superseded by 0008 (deployment restriction only) |
| [0005](0005-linkedin-groups-labels-and-app-cleanup.md) | 2026-11-21 | Add Home field groups, remove obsolete fields, use Title Case and remove the separate official app | accepted |
| [0006](0006-configurable-contact-creation-and-employees.md) | 2026-11-21 | Make contact creation configurable and follow email/calendar's treatment of employees | accepted |
| [0007](0007-open-the-rebuild-pull-request.md) | 2026-11-21 | Commit and open the complete rebuild for review against main | superseded by 0008 (deployment restriction only) |
| [0008](0008-merge-main-and-deploy-to-production.md) | 2026-11-21 | Merge main, commit/push and deploy the rebuild to the live CRM | superseded by 0009 (deployment authorization only) |
| [0009](0009-cancel-the-production-deployment.md) | 2026-11-21 | Cancel deployment while retaining the completed merge and push | superseded by repository 0005 |
| [0010](0010-automatic-webhook-and-internal-configuration.md) | 2026-11-21 | Configure the webhook automatically and remove obsolete/internal settings | superseded by 0011 (webhook setup mechanism only) |
| [0011](0011-app-managed-webhooks-and-service-key.md) | 2026-11-21 | Let the app configure its webhook automatically from a Service Key | accepted |

See the [app handoff](../../../packages/twenty-apps/internal/fundlevel-linkedin/HANDOFF.md)
for verified completion, preview limitations and production status. Record 0009
previously cancelled deployment; repository decision 0005 supersedes that cancellation.
The migration-stage app is now installed in production, with native connection,
message migration and final pruning still pending.

[Repository decision 0005](../0005-roll-out-six-sessions-to-live-crm.md) resumes production rollout on 2026-11-21.

[Repository decision 0006](../0006-connect-linkedin-after-the-rollout.md) defers LinkedIn connection setup and history migration until the owner is ready.

[Repository decision 0007](../0008-use-native-enum-fields-across-apps.md) records the cross-app native enum field rule and backfill request.
