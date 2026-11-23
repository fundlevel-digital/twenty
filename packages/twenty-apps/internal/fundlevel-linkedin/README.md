# LinkedIn Sync (Fundlevel)

LinkedIn conversations in Twenty's native messaging, with member sign-in, privacy,
connections and invitations. The existing app identifier is preserved. Decisions
are indexed in [root docs](../../../../docs/decisions/linkedin/DECISIONS.md);
[HANDOFF.md](HANDOFF.md) records the verified preview and deployment state.

## Behavior

- Hosted Unipile sign-in lets the member choose a proxy and country at login.
- Each member gets a native channel. Replies and opt-in mark-as-read use its messaging provider.
- Messages default to **Metadata** sharing. Connections default to **Workspace**, with an
  independent **Only Me** setting after native privacy setup and access verification.
- History supports None, 10, 20, 50 and **All**; default All. Jobs are resumable,
  cancellable and recoverable after rate limits or lost queue deliveries.
- Sales Navigator and InMail can be selected separately; both default on. Turning
  off an inbox stops future imports without deleting already imported messages.
- Contact creation supports **None**, **Sent**, and **Sent and Received**; default None.
  Deterministic Person IDs prevent duplicate creation on retries. Matching tries
  stable member ID, exact primary/secondary profile URL, then optional unique-name fallback.
- Like native email/calendar, recognized self/workspace members do not become new
  People. Existing People may be linked by exact identity; Workspace Member attribution
  is also retained. Known employees skip name fallback. Matching uses owned account
  identities/profile/channel handles. Names or `linkedin.com` alone cannot identify coworkers.
- Five-minute catch-up imports missed webhooks with frozen chat pages and per-chat
  watermarks. With history disabled it does not import pre-connection conversations.
- Three-hour connection/invitation polling reconciles absent entries only after a
  complete snapshot. A missing pending request becomes Not Connected; absence does
  not establish withdrawal versus rejection. Bulk reconciliation respects the 200-record API limit.
- Database-backed leases arbitrate jobs and space provider calls at least 2.1 seconds apart.
- D1 is not used. Disconnect/uninstall release local resources without explicitly
  deleting the upstream provider account.

## Objects And Migration Stages

The final app defines `linkedinAccount`, `linkedinConnection` and internal
`linkedinSyncLease`. Native messaging replaces the old custom Chat/Message objects
and old Person LinkedIn tab. Accounts and leases are private; connection records
have owner/visibility fields.

**Do not apply the final app with pruning to an unmigrated workspace.** Build the
migration-stage app first using `scripts/prepare-migration-stage.mjs`. It restores
legacy definitions and migration read permissions from `migration/**/*.template`.
These templates are not SDK-discovered source files. The migration preserves legacy
rows until a separate, explicit final prune.

Core ingestion cannot represent every legacy reaction, receipt or provider field.
Export full source rows before pruning. Empty legacy chats do not create empty
native threads. Never assign an unowned legacy account to a person by inference.

## Native Privacy Prerequisites

The server must contain the fix in
`get-permissions-principals-share-keys.util.ts`: embedded application/agent shares
must not expand the caller's private-record access. Include it in both server and
worker images. Native private records and record sharing must be available/enabled.
The installer uses administrator access to the server container and does not edit
built-in roles or replace unrelated role overrides.

```sh
docker exec <server> yarn command:prod feature-flag:update -w <workspace-id> --flag IS_PRIVATE_RECORDS_ENABLED --value true
docker exec <server> yarn command:prod feature-flag:update -w <workspace-id> --flag IS_RECORD_LEVEL_SHARING_ENABLED --value true
node scripts/configure-connection-privacy.mjs --container <server> --workspace-id <workspace-id>
node scripts/configure-connection-privacy.mjs --container <server> --workspace-id <workspace-id> --apply
```

The first installer command is a dry run. Existing incompatible shares or non-owner
creators stop installation for review. It uses native private-record/share services
and preserves compatible grants. It grants the application's **grant role**, not
its default function role, access to internal records, and gives real owners their
account/connection shares. It records object/role IDs in internal app KV.

Verify shared/private access as two different members, another administrator, and
with embedded front-component tokens before setting the internal `linkedin-private-records-ready` app KV marker to true.
New records carry native shares at creation. Visibility updates use the member's
native sharing authority; they restrict before labeling records private and publish
after recording Workspace. Large accounts may take over a minute because the native
API updates privacy per record. Settings/connection sync share a lease while this runs.

## Configuration

Use the existing Unipile Service Key from private runtime configuration; never print it. The app retrieves the webhook signing secret from Unipile automatically.

- Workspace variable: **Unipile Service Key** (`UNIPILE_API_KEY`), with webhook-management permissions.
- Developer registration server variables: the same names, for hosted sign-in and
  server-wide webhook resolution. Configure these as well as workspace variables.
- Internal app KV `linkedin-private-records-ready`: false until native setup and access checks pass; this is not a user-editable application variable.

The Cloudflare archive variables are obsolete. Keep the direct webhook signing
secret even after retiring archive-only configuration.

## Build And Checks

Run from this package in the cloud:

```sh
corepack yarn install --immutable
./node_modules/.bin/tsgo --noEmit -p tsconfig.spec.json
corepack yarn test
corepack yarn lint
npx -y twenty@2.59.0 --no-input app build
```

The SDK, client and Unipile SDK are pinned to 2.59.0. Verification covers jobs,
leases, policy parsing, employee matching, ownership, privacy ordering and migration
acknowledgement/attachment guards. See the handoff for runtime evidence and limits.

## Staged Cutover

The preview completed these stages; the rebuilt app has **not** been deployed to
the production CRM. A future cutover needs the following sequence:

1. Prepare a separate migration-stage directory outside this app:

   ```sh
   node scripts/prepare-migration-stage.mjs --output /tmp/linkedin-migration-stage
   npx -y twenty@2.59.0 --remote <target> --no-input app apply --path /tmp/linkedin-migration-stage --no-prune
   ```

2. Configure variables and native privacy using the prerequisites above. Test actual
   member and embedded-token access before enabling owner-only sharing.
3. Each member connects in app preferences. Adoption requires matching ownership;
   the original provider account ID is preserved for migration attachment downloads.
   Resolve unassigned accounts without guessing their human owner.
4. Inspect migration destinations, then run each account until Completed:

   ```sh
   npx -y twenty@2.59.0 --remote <target> app exec --name linkedin-migration-status --payload '{}'
   npx -y twenty@2.59.0 --remote <target> app exec --name linkedin-migrate-messages --payload '{"connectedAccountId":"<id>"}'
   ```

   Function execution requires a signed-in workspace user; the preview's API-key
   remote cannot execute functions by itself. Native signed-user GraphQL execution
   was used for preview checks.

   Every page must be acknowledged before its cursor advances. Default mode
   downloads supported original attachments and stops if any expected file is missing.
   Explicit `savedDataOnly:true` preserves available attachment metadata in clearly
   named JSON files, without contacting Unipile. It is an accepted missing-original
   exception, not an original-file import. Keep the same mode when resuming.
5. Export complete source rows and reconcile counts, original IDs, text, timestamps,
   participants, attachments and privacy. Check replies, read acknowledgements,
   invitations and catch-up after withholding a webhook. Preserve exported legacy
   fields with no native equivalent. Only then review and apply final pruning:

   ```sh
   npx -y twenty@2.59.0 --remote <target> --no-input app plan --prune
   npx -y twenty@2.59.0 --remote <target> app apply --prune
   ```

6. Save the Unipile Service Key and verify the automatic webhook health check.
   Delivery uses the app-managed workspace route; no signing secret is entered.
   The deployed old Worker/D1 were deleted at the owner's request on 2026-11-21.
7. Uninstall the separate official LinkedIn app only with its destructive hook behavior
   accounted for. Its original disconnect/uninstall deletes upstream accounts; our
   replacement does not alter that app's code. The preview disabled those cloned
   hooks before uninstalling. Production removal is still pending.

## Automatic Webhook Configuration

Saving the **Unipile Service Key** runs the app's native health check, which
creates or repairs its webhook. A scheduled app function retries every five
minutes. No administrator command or manual signing-secret input is required.
The app stores only the endpoint ID in internal KV and retrieves its signing
secret directly from Unipile when verifying delivery.

Setup reuses this workspace's exact callback URL, preserves unrelated endpoints,
and verifies the public route before changing delivery. On installations without
a separate public function domain, it uses Twenty's workspace URL. The
former registration endpoint is adopted only when an operator explicitly scopes
its known endpoint ID to this workspace during the upgrade. Another workspace's
shared server endpoint is not adopted implicitly.

The old `configure-webhook.mjs` command is retired. LinkedIn sign-in and legacy
history migration remain deferred until the owner is ready.

Archive URL/token variables and the manual privacy-readiness toggle were removed
from production. Readiness is an internal app KV value, set only after native
permission setup and verification; an old True environment flag is ignored.
See [decision 0010](../../../../docs/decisions/linkedin/0010-automatic-webhook-and-internal-configuration.md).

## Native Enum Field Upgrade

Categorical attributes use native Select/Multi-Select fields. This upgrade adds
typed fields for earlier text categories and keeps the old raw values and field
identifiers for compatibility. Imports populate the typed values; the shared
[backfill CLI](../../operations/README.md) fills existing records without provider
calls or overwriting selections. Review a dry run after installing the updated
metadata. Source/preview verification does not imply production deployment.
