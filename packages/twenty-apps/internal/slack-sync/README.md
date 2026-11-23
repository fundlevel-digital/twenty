# Slack Sync

Internal Twenty app for per-member Slack user connections, independent of the upstream assistant bot. Requires the accompanying fork changes for provider deduplication, conversation records, and message metadata updates. Applying this app to an unmodified upstream server is unsupported.

See the [implementation guide](../../../../docs/slack-sync.md) and [owner decisions](../../../../docs/decisions/slack/DECISIONS.md) for architecture, current verification and rollout limits.

## Setup

1. Build and deploy the server/frontend fork changes and run its upgrade commands before applying this app.
2. From this directory, install dependencies with Yarn and run the this fork’s Twenty app CLI `app apply --create --no-prune` against the intended workspace. Repeat for each Twenty workspace.
3. Set application variables `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` and `SLACK_SIGNING_SECRET` using that workspace's own internal Slack app. Secrets stay in application variables; user tokens are persisted by Twenty's encrypted connection flow.
4. In Slack, register the exact callback base URL `/auth/apps/custom/callback` on the central login host (for example `https://crm-login.fundlevel.co/auth/apps/custom/callback`). The app sends the connection flow's signed state through Slack OAuth.
5. Grant user scopes: `channels:history`, `groups:history`, `im:history`, `mpim:history`, `channels:read`, `groups:read`, `im:read`, `mpim:read`, `reactions:read`, `users:read`, `users:read.email`, `files:read`.
6. Subscribe to user events `message.channels`, `message.groups`, `message.im`, `message.mpim`, `reaction_added`, `reaction_removed`. Set the workspace-specific Events API URL to `https://<workspace-host>/s/webhook/slack-sync`. Raw-body HMAC verification and the Slack URL challenge are supported.
7. Each teammate connects Slack from **Apps preferences → Slack Sync → General**. The message channel starts with METADATA sharing; members can use standard sharing settings to share more.

Keep these Slack apps internal and disable Slack token rotation for this MVP; the custom connection callback persists nonrotating user tokens. Install only in the intended Slack workspace. No credentials or live connections are included in source.

## Behavior

- Slack Connect conversations start enabled; other public/private conversations, DMs and group DMs are opt-in through Twenty message-folder settings. Discovery runs on connection and every five minutes, so enabling a folder starts backfill on the next discovery pass.
- New folders import the last 30 days. Apps preferences → Slack Sync → Sync → Load conversations exposes an owned conversation selector and a Last 30 days / All available history import button. Disabled folders are never imported.
- History pages and thread replies run as queued jobs. Slack rate limits reschedule the current cursor using Retry-After. The queue retries other failures five times; replaying an import is safe through deduplication. A fixed upper bound prevents a running history import from chasing new messages indefinitely.
- Live events are acknowledged after durable queue submission, then processed separately. Each connected token must independently prove membership of the enabled conversation. The app does not trust Slack's truncated `authorizations` array as a complete access list.
- Slack messages have a team/conversation/timestamp identity. Threads use Slack's parent timestamp. The opted-in messaging provider shares one stored message across connections while preserving individual channel associations and sharing settings.
- Participant emails match existing People primary emails and workspace-member emails. Ambiguous matches are left unlinked. The channel's recipients are included so outgoing messages reach client People timelines and Company rollups. Contact auto-creation is configurable in Apps preferences → Slack Sync → Sync, and starts at None. Sent and Sent and received use the native email Person/Company creation pipeline. Existing contacts stay linked even when creation is disabled.
- Edits replace text. Reaction summaries, permalinks and timestamps are stored in providerMetadata. Deletes are soft and leave a persistent app tombstone so later history cannot resurrect them. Server access rules hide internally deleted messages except from the sender; external deletions remain marked deleted.

## MVP limits

Slack retention and user-token access define available history. Threads whose parent predates the import window are only found when Slack returns that parent or a live reply arrives; choose All available history for a complete retained thread history. Slack files are imported as native message attachments, up to 20 MiB per file and 40 MiB per message. Inaccessible, external, or oversized files expose a Slack Attachment Status diagnostic; transient download failures retry without partially committing the native batch. A changed provider file set after the first native attachment batch is reported rather than silently appended. Opened native threads render Slack mentions, standard emoji, links, emphasis and code; conversation-list summaries remain plain text, and custom emoji retain their shortcodes. Eligible external participants can also match existing additional email addresses through native ingestion. For very large channels, the stored recipient list is capped at 255 with matched People prioritized, plus the sender.

Discovery retains previously seen folders if access is later revoked. Live event processing rechecks membership; a history call with revoked access fails rather than importing inaccessible content. Import progress and terminal job errors are not yet surfaced in app settings; queued means accepted, not completed. The queue and server logs are the current diagnostics.

## Verification

`yarn test:unit`, `yarn typecheck`, and `yarn lint` run the app tests, TypeScript checks and lint. Source is compatible with the published SDK through a typed opt-in provider extension and a raw metadata mutation for the fork-only update API. A live Slack OAuth/event round trip still requires the operator's internal app and workspace credentials.

API references: [Slack OAuth](https://docs.slack.dev/authentication/installing-with-oauth/), [signed requests](https://docs.slack.dev/authentication/verifying-requests-from-slack/), [event authorizations](https://docs.slack.dev/changelog/2020-09-15-events-api-truncate-authed-users/), [thread history](https://docs.slack.dev/reference/methods/conversations.replies/).

## Slack navigation and native records

The sidebar contains a Slack folder with Channels, Threads, and Slack Messages. Channels are app-owned records keyed by Slack workspace/conversation IDs. Threads and messages use the existing native objects, with app-owned Slack identifiers and relations to the channel; no message bodies are duplicated. Native views filter on the Slack ID fields. Replies retain their canonical Slack parent ID and a native parent/replies relation, linked when the parent arrives. Discovery binds each message folder to its Channel record so the same connection visibility governs channel names. The channel object is read-only in the UI; include/exclude remains in message-folder settings.

Native record access still uses messaging permissions. Slack Message ID, channel, reply, and attachment-status fields are populated through the application-owned ingest/update path. The app role reads message IDs to repair out-of-order parent relations and has the file-upload permission for native attachments. It has no general permission to update native message bodies.

## Record Slack tabs

People and Companies have an app-owned Slack tab. It uses the record's native conversation timeline and native Slack channel/thread relations, groups threads under collapsible channel headers, and opens the selected thread in Twenty's side panel. Counts and snippets come from the native reader, including sharing and internal-deletion filtering. Refresh reloads the list; Load more continues the timeline page. Company conversations roll up through related People.

Embedded timeline requests require a current user and are forced to the calling application's own message channels. Background app tokens cannot call the timeline reader. The app role reads People, Companies, Messages, Threads, and its own Channels; it does not gain general write access to native messages.

Authorized deleted chat messages use amber text with a strike-through and an amber Deleted tag. Internally deleted messages from another member remain absent. Thread subjects and message counts are also visible in the native Messages tab.


## App preferences and imported test data

Connection and history controls use the native **Apps preferences** surface, matching the LinkedIn app's USER-scoped Sync menu. The health action opens `/settings/app-preferences/<applicationId>`. The Sync tab loads automatically, only offers usable OAuth connections for live history imports, and shows the current member's imported-test-data summary. Slack OAuth client/signing credentials remain server-side, scoped to the installed app; members use the native connection flow.

Standalone posts show their message body and `1 message`. Channel headers count multi-message threads separately from standalone posts; multi-message rows show reply counts. A reply promotes the same native item into a thread without creating a second post.

A connected-Slack tool import is explicitly a snapshot. It does not authorize the VM app for live Slack events or history polling. Source message/thread identities and raw bodies are preserved, and broadcast replies are deduplicated into their original thread. Real imported channel data stays separate from synthetic records and uses private message-channel visibility.

## Contact auto-creation and employees

Contact preferences belong to the signed-in member and apply to that member's Slack connections, including newly connected accounts. Choose None, Sent, or Sent and received; group-address and non-professional-email exclusions follow the same classifiers as email. Sent means a message authored by the connected Slack account and includes eligible members of that conversation. Enabling creation affects new deliveries and future history imports, without starting a history import itself.

Full members of the installing Slack workspace, connected Slack accounts, and matched Twenty workspace members never become new leads. Slack guests remain eligible unless another exclusion applies. Employee email domains additionally exclude teammates in other workspaces, including subdomains. Bots, deactivated users, users without email, and users with unknown Slack workspace membership are not offered for creation. Existing People matches remain linked.

Native ingestion accepts an optional participant contactEmail independently of its Slack handle. Channel preferences control Person/Company creation through the existing email pipeline, preserving duplicate handling, company reuse, restored contacts, and name enrichment. The Slack handle remains the message participant identity. Ambiguous email matches are not attached. Native email imports retain their existing queued creation path.

## Native Enum Field Upgrade

Categorical attributes use native Select/Multi-Select fields. This upgrade adds
typed fields for earlier text categories and keeps the old raw values and field
identifiers for compatibility. Imports populate the typed values; the shared
[backfill CLI](../../operations/README.md) fills existing records without provider
calls or overwriting selections. Review a dry run after installing the updated
metadata. Source/preview verification does not imply production deployment.
