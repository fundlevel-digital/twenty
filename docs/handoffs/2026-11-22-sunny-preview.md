# Sunny Preview — 2026-11-22

[Decision 0010](../decisions/0010-sunny-live-state-vm-preview.md) authorizes copying Sunny’s current live CRM state into this VM and using the preview for subsequent work.

## Running Preview

URL: https://fundlevel-w935.conductor.show/

The preview runs the actual live image `ghcr.io/fundlevel-digital/twenty:1913516c9b8e4b3177c9ccb50412b551a300c9f3`, including its bundled frontend. It does not serve modified frontend source from this checkout. Future host UI changes require rebuilding or running the source frontend.

Sunny’s workspace ID is `d3ce8b66-a75f-411e-a7bf-2bd7295eb76e`. A fresh `pg_dump` was streamed directly from production and restored successfully into VM PostgreSQL 16. Sunny and shared application files were streamed directly from the live Docker volume. No backup archive was created on production. Other workspace entries and data schemas were removed from the clone so the single-workspace preview opens Sunny. The temporary full database dump and production container inspection were deleted after verification.

## Isolation And Sign-In

Database, Redis and file storage are independent of production. Runtime URLs point at the preview. Custom-domain routing is disabled locally. Google/Microsoft providers, SMTP delivery, billing, telemetry, marketplace cron synchronization and startup migrations/cron registration are disabled. Provider credentials are omitted from runtime environment; encrypted app/connection state remains copied. Mail logs locally.

A restricted worker processes only workspace metadata, entity-event persistence, event logs and deletion queues. Messaging, cron, workflow, logic-function and provider-sync queues are not processed. This is a review runtime, not a continuously synchronizing production replica. Deliberately invoking integration functions in later work still requires checking external effects.

Kareem’s copied account has no password because it uses Google sign-in. A new preview-only password was set for that cloned account, with credentials stored privately in ignored `.context/private/login.txt`. Production authentication was unchanged. Preview credential files, encryption configuration and browser sessions must remain untracked.

## Verification

- All 40 Sunny workspace tables matched live row counts and content digests: 122,464 rows total. Digests were checked before browser interactions.
- All 244 copied files passed SHA-256 verification against the live source manifest.
- Restored applications are Fathom, Last Contact, Standard and Custom. PlusVibe is not installed in Sunny’s live state and was not added by this task.
- Backend `/healthz` returned healthy. Password sign-in through the metadata API and a fresh browser session succeeded without errors.
- An authenticated browser opened Sunny’s Companies table, loaded records and metadata, and reported zero page or HTTP errors. The Applications settings page also rendered and six images loaded successfully. Screenshot: ignored `.context/sunny-preview.png`.
- Browser verification used local TLS and Chrome host mapping for the preview hostname. It bypasses Conductor’s edge. An anonymous public request returned the expected Conductor 401 sign-in gate; the owner’s authenticated edge session was not tested.

## Processes And Recovery

Docker containers `sunny-preview-postgres`, `sunny-preview-redis`, `sunny-preview-server` and `sunny-preview-worker` have `unless-stopped` restart policies. They remained running across command calls. Docker was started with host networking and no bridge/iptables, as required by this sandbox. The database listens on loopback; private PostgreSQL configuration is under `.context/private/`. Container restart policies require a running Docker daemon and do not wake the VM. No survival across VM shutdown is claimed.

Repository dependency installation completed successfully with peer/build-script warnings. No product source changed and no test suite was required for this runtime-only setup.

Temporary production SSH access was removed after transfer and verification. No production data, app installation, deployment, provider refresh or import batch was changed. Hindsight’s private profile remains unavailable; no remote-memory write is claimed.

## Follow-Up: PlusVibe And Cal.com Installed

[Decision 0011](../decisions/0011-install-plusvibe-and-cal-com-in-sunny-preview.md) records Kareem’s installation request. Both apps were installed successfully from this checkout through the dedicated `sunny-vm-preview` CLI remote at the local backend. The registrations copied from the shared instance were unowned after removal of Fundlevel; the native claim-ownership mutation assigned these preview registrations to Sunny before installation. Production registrations were untouched.

Cal.com applied 137 creates and uploaded 47 files. PlusVibe applied 861 creates and uploaded 60 files. Both used `--no-prune`, with zero updates or deletions. Database checks confirm both installations and their objects, including Cal.com Bookings and all twelve PlusVibe source/link objects. The restricted worker remains active for metadata work.

Provider connections and Cal.com OAuth credentials were not configured; no provider webhook registration, sync batch or history import was started. Existing data-table counts remain the same except the owner’s two newly added blocklist entries, which were preserved. The initial 122,464-row digest describes the original snapshot, not the later app-enriched schema.

An authenticated browser confirmed both apps on Settings → Apps → Installed with zero page/HTTP errors. Screenshot: ignored `.context/sunny-installed-apps.png`.

Memory recall/retention remains unavailable because the private Hindsight profile is missing.

## Feasibility Correction: Google Workspace Shared-Channel App

Kareem asked: "Can this be a just a Twenty CRM app or no?" The earlier agent statement that the entire feature requires core backend/UI changes was too broad. Current source exposes app OAuth connections, `createMessageChannel`, native message ingestion, email-style messaging providers and `sendMessageLogicFunction` callbacks. The preview image contains the application-channel and messaging-provider sender services. These support packaging Google authorization, Group routing, import/reconciliation and Gmail sending as an installable app using native message/thread records. This is a source/capability finding, not a completed implementation or tested Google connection.

The standalone route should use an app-owned Google OAuth connection rather than assume access to a member’s existing native Gmail credential. Existing visibility options are metadata, subject and sharing everything; arbitrary Google Group membership-based native-message ACLs require a separate permission design. The existing Communication Channels list filters for `EMAIL_GROUP`, so app channels need their own app settings unless host UI changes are also made. No owner decision to implement the new app has been recorded or inferred from the feasibility question.

## Runtime Verification Of App-Only Messaging

After Kareem requested verification rather than guessing, an app-only synthetic probe was installed and tested in this preview. See the [verification report](2026-11-22-google-channel-app-verification.md) for passed native messaging, sharing, privacy and Google authorization-redirect checks, screenshots, test state and unverified real-Google integration. The report supersedes the earlier source-only feasibility assessment; it does not claim a complete Google Workspace connector.
