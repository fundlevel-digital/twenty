# LinkedIn Sync Handoff

Updated 2026-11-21. Branch: `fundlevel/linkedin-sync-app`. Base: `origin/main`.
Do not rename the branch or apply this rebuild to production without a separate
production cutover request. Owner decisions and the exchange behind them are in
[root docs](../../../../docs/decisions/linkedin/DECISIONS.md).

## Combined Production Rollout

The owner renewed deployment authorization in [repository decision 0005](../../../../docs/decisions/0005-roll-out-six-sessions-to-live-crm.md). The updated core and this app’s migration stage are now installed live. All 821 legacy messages remain intact; native connection, account ownership, privacy verification and staged migration remain pending. The separate official LinkedIn app was retained. See the [rollout handoff](../../../../docs/handoffs/2026-11-21-live-crm-rollout.md) for current status. The sections below record the earlier session and cancellation.

## Latest Upstream Integration

The branch incorporates `origin/main` at `ce46a29e1b`, including the upstream
integration/computed-field editor and PlusVibe app. Shared decision indexes retain
LinkedIn, YouTube, PlusVibe and repository records; root agent instructions are
regenerated from all Ruler sources.

Upstream changed permission principals from one `roleId` to `roleIds`. The source
privacy fix now preserves every main-principal role share while excluding delegated
application/agent role shares. A multi-role regression check accompanies the existing
three cases. The isolated preview still runs the earlier, compatible single-role
helper on its original image; do not copy the new multi-role helper into that old
runtime. A future deployment must use the matching server/runtime version.
Production deployment remains canceled under decision 0009.

Verification after this integration: 287 app tests, 12 legacy tests and four
core privacy tests pass (303 total), along with direct app typecheck/lint, core
privacy lint and a focused typecheck using the current server/shared source types.

## Latest Branch And Deployment Status

On 2026-11-21, `origin/main` was merged, conflicts resolved and the result pushed
as `297672a0f7`; all 302 tests, direct app typecheck and lint passed after merging.
The owner requested production deployment, then canceled it before any production
write or deployment command ran. The rebuild remains preview-only. Temporary
production CLI credentials copied into this workspace were removed; see decision
[0009](../../../../docs/decisions/linkedin/0009-cancel-the-production-deployment.md).

## Completed

The existing LinkedIn Sync app was rebuilt around native messaging and per-member
connections/settings, retaining connection/invitation polling, unlimited history,
Sales Navigator/InMail controls and missed-webhook catch-up. Hosted sign-in exposes
proxy/country overrides. D1 code/config is removed. Labels use Title Case.

The full CRM preview runs at **https://fundlevel-w900.conductor.show/**, protected
by Conductor authentication and workspace access. It contains the copied production
database/config and app assets, excluding large existing uploaded files. Only the
`cloud-preview` remote (`http://127.0.0.1:8765`) received the rebuild.

Native privacy is configured and verified. Accounts/internal leases are private;
connections default to Workspace and can be restricted to Only Me. An embedded-token
leak was fixed in core `get-permissions-principals-share-keys.util.ts`: limiting
application/agent principals must not add their private-record share keys to the
caller's. Both preview server and worker run that fix. Production needs the core
fix before owner-only sharing is enabled; an app-only deployment is insufficient.

All **821 legacy messages** migrated into native messaging across **144 threads**.
Text, timestamps and original message/thread identifiers reconcile exactly. Six
messages with unavailable original files have clearly named JSON attachment metadata
files. The owner explicitly chose saved data and simulated provider responses after
Unipile reported an inactive subscription. Original files were not fabricated.

The owned account contributed 584 messages. The other 237 had no assigned human
owner; they are held on a disabled technical archive account with Metadata visibility.
The custom source account remains unassigned. Do not infer a human owner or enable
that technical account for sign-in. Its original ownership still needs a real owner
if these messages are to become accessible as someone's private conversations.

Full legacy rows were exported privately before retirement. After exact reconciliation,
the preview's custom LinkedIn Chat/Message objects, dependent metadata, navigation and
old Person LinkedIn tab were pruned. The final source excludes those definitions;
`migration/**/*.template` and `scripts/prepare-migration-stage.mjs` reconstruct a
pre-retirement app for a future staged migration. See README before any production apply.

Automatic contact creation is configurable: None, Sent, Sent and Received; default None.
Native email/calendar behavior informed employee handling. Known internal identities
never auto-create People, link an existing Person by exact identity and attribute the
Workspace Member. Names alone cannot establish employee status. Known identities come
from owned LinkedIn accounts/profile/channel handles; disconnected/unknown coworkers
without an identity mapping cannot be recognized reliably.

## Actual Production And External Changes

Earlier in this session, live Home LinkedIn groups were added to People, Companies,
Influencers and Workspace Members, and three obsolete Person LinkedIn ID fields were
removed. These predate the cloud-preview rebuild.

The owner separately requested deleting the deployed archive. Cloudflare Worker
`fundlevel-unipile-archive` and D1 `unipile-archive` were deleted; follow-up lookups
confirmed their absence. Production webhook delivery needs direct routing configured
at cutover. This external deletion does not mean the rebuilt CRM/app is deployed.

The separate official LinkedIn app was safely uninstalled **from the preview only**,
with its cloned destructive uninstall/disconnect hooks disabled first. It remains
installed in production. Our app's replacement hooks do not explicitly delete
upstream Unipile accounts.

## Verification

- 287 app Vitest tests, 12 legacy mapping/signature tests and 3 core share-key tests pass.
  Direct app `tsgo` and lint pass; no translation catalogs were regenerated.
- Real CRM login/settings and queued All-history import work with simulated responses.
- Missed-webhook catch-up imports new messages; replay creates no duplicate messages/People.
- None/Sent-and-Received settings, replies, opt-in read acknowledgements, signed compatibility
  and registration webhooks, invitation/connection snapshot removal and ownership rejection pass.
- Simulated employee ingestion creates no Person, attributes Workspace Member and reuses
  an existing Person after exact profile matching. Synthetic data was removed afterward.
- Full visibility route: owner sees 1,576 connections; another member sees 106 when the
  1,470 owned connections are private, and 1,576 after Workspace sharing is restored.
- Direct member/other-admin/embedded-token privacy checks pass. Final embedded-token check
  exposes one owned account to the owner, zero accounts to the other member, zero leases to both.
- Final installed preview app hash: `ad38767ad7032bb5556040993232221011211e9648068dc8fc3337787b2a0e2a`.

These are saved-data/simulated-provider checks, not a live Unipile acceptance test.
Original attachment downloads and real sign-in/provider behavior remain unverified
while the subscription is inactive.

## Resume The Preview

Private login, DB snapshot, source export, credentials and test evidence live in
`.context/twenty-preview/private/` (gitignored). Never print or commit them. Preview
operator notes are `.context/twenty-preview/README.md`; start script is
`.context/twenty-preview/start.sh`. Containers have no default internet route; the
host gateway rejects live provider credentials. SMTP is logger-only and crons are disabled.
The public preview needs this cloud workspace to remain running.

Services: `twenty-preview-db`, `twenty-preview-redis`, `twenty-preview-server`,
`twenty-preview-worker`. The server/worker use the original copied runtime image
with the small core privacy fix patched into their compiled output. Recreating
containers loses that patch; restart preserves it. Source fix and regression tests
are in `packages/twenty-server` and must be included in a proper future image.

Workspace: `3b424be9-f8da-41b6-b564-16c9da2df4e1`.
Own application universal ID: `52d88794-a0fa-4e26-bbbe-8efe622efb52`.
Installed application ID: `88261615-782f-404f-8f9c-03439c93ba96`.
Function role identity is preserved; the native application grant role is distinct.
Use the grant role for private-record application shares, never the function role.

Hindsight was unavailable in this workspace because its private profile was absent.
No memory retention is claimed. The decision records, source and private verification
evidence are the handoff sources.

## App-Managed Webhook Follow-Up (2026-11-21)

The previous one-time administrator helper did not meet Kareem's automation
request. The app now configures/repairs its webhook during the native settings
save health check and retries every five minutes. The only workspace credential
is **Unipile Service Key**; the manual signing-secret variable was removed.
Secrets stay at Unipile and are retrieved for signature checks. The retired
operator wrapper fails with guidance to save the Service Key instead.

Endpoint discovery handles both public app domains and Twenty's workspace URLs.
Only exact workspace URLs or an explicitly scoped legacy endpoint are adopted;
unrelated and other-workspace endpoints are preserved. Sign-in, native privacy
verification and the 821-message history migration remain deferred. See
[decision 0011](../../../../docs/decisions/linkedin/0011-app-managed-webhooks-and-service-key.md)
and the [rollout handoff](../../../../docs/handoffs/2026-11-21-live-crm-rollout.md)
for live verification.
