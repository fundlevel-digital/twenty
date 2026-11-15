# LinkedIn Sync (Fundlevel)

Syncs our LinkedIn accounts into Twenty through [Unipile](https://www.unipile.com) (API v2). Read-only: it never sends a message, invite or InMail.

## What it adds

| Object | One record per | Notes |
| --- | --- | --- |
| **LinkedIn Account** | Connected LinkedIn account | Matched on the LinkedIn User ID, so a re-link in Unipile updates the same record. **Sync Stage** drives the full sync. |
| **LinkedIn Connection** | Account and LinkedIn member pair | Connections, pending requests (sent and received) and people we only chat with (**Not Connected**). Unique **Sync Key** = `<account LinkedIn User ID>:<member ID>`. Linked to a Person only on an exact match. |
| **LinkedIn Message** | Message | Unique on the Unipile message ID, so a message is never stored twice. |

On **People** it adds the reverse **LinkedIn Connections** relation and three ID fields filled as the sync reveals them, never fetched on purpose: **LinkedIn Member ID** (unique), **LinkedIn Sales Navigator ID**, **LinkedIn Numeric Member ID** (unique).

The **LinkedIn conversation** widget, for People record pages, shows the chat bubbles, with one tab per account plus **All**.

## How it runs

| Function | Trigger | What it does |
| --- | --- | --- |
| `linkedin-unipile-webhook` | `POST /s/linkedin/unipile-webhook` | Checks the `unipile-signature` header, then handles the event. Account events upsert the account, and add or reconnect queues a full sync. Message, receipt and reaction events re-read that chat and store new or changed messages, flagging **Needs Attention** on a new reply. `relation.new` stores the new connection. |
| `linkedin-sync-tick` | Every 5 minutes | Advances the full sync of every account whose **Sync Stage** is Queued or in progress: connections, then sent and received requests, then every inbox (chat map), then message history. Progress is saved after every page, so a timeout or deploy loses nothing. |
| `linkedin-refresh-accounts` | Every 3 hours | Re-reads all accounts (status, products, proxy). Profile URL, picture and Sales Navigator ID are refreshed at 09:00 UTC only. |
| `linkedin-link-created-person`, `linkedin-link-updated-person` | Person created, or Person LinkedIn link / Member ID changed | Links unlinked connections that match the person exactly, and fills their LinkedIn IDs. |

**Matching rules.** A Person is linked by exact LinkedIn Member ID first, then by exact profile slug. A slug shared by several people links nobody. Existing links are never replaced, and people are never created.

**Rate limits.** Calls are spaced 2.1 s apart per account, about 28 a minute, so the account stays under a 30-per-minute Unipile limit. A 429 is waited out while the run has time. One account is synced at a time.

**Full sync of an account.** Set **Sync Stage** to **Queued**. Set it to **Paused** to stop. After 5 consecutive errors it moves to **Failed**, and **Sync Error** holds the last error. A chat that fails 3 times is skipped, and its error is kept in the connection's **Message Sync State**.

## Raw data archive (`worker/`)

Every raw Unipile payload is kept in Cloudflare D1 by the `fundlevel-unipile-archive` Worker:

- **Webhooks.** Unipile's webhook endpoint is the Worker's `POST /unipile/webhook`. The Worker checks the signature, stores the event in `unipile_event`, then forwards the original request to the app's route. If Twenty does not accept an event (unreachable or a 5xx), the Worker's 10-minute cron re-sends it, re-signed, up to 5 times within a day.
- **Objects.** After every Unipile read, the app sends the raw objects to `POST /objects`. That covers accounts, profiles, relations, requests, chats and messages, including LinkedIn event messages. `unipile_object` keeps the latest version per kind and Unipile ID.
- **Archiving is at-least-once.** A failed archive call is retried, then fails the sync step, so the page or conversation is re-read on the next run instead of leaving a gap.
- **Reading it back.** `GET /events?type=&account_id=&before_id=&limit=` and `GET /objects/<kind>/<unipile id>`, both with the bearer token. Or run `wrangler d1 execute unipile-archive --remote --command "<sql>"`.

Worker secrets, set with `wrangler secret put`:
- `UNIPILE_WEBHOOK_SECRET`: the Unipile endpoint's signing secret, also set in the app.
- `INGEST_TOKEN`: also set in the app as `ARCHIVE_TOKEN`.

Run `npm run migrate` after adding a file to `worker/migrations`.

## Setup

1. `yarn install`, then deploy with the `twenty` CLI to the workspace.
2. In the app's settings, set:
   - `UNIPILE_API_KEY`: a Unipile v2 key
   - `UNIPILE_WEBHOOK_SECRET`: the signing secret of the webhook endpoint created in step 3
   - `ARCHIVE_URL` and `ARCHIVE_TOKEN`: the Worker's URL and its `INGEST_TOKEN`
3. Deploy the Worker (`cd worker && npm run migrate && npm run deploy`, then set its secrets). In Unipile, add a webhook endpoint at `https://fundlevel-unipile-archive.fundlevel.workers.dev/unipile/webhook` for the account, message, receipt, reaction and relation events. The Worker forwards events to `https://<twenty-workspace>/s/linkedin/unipile-webhook`.
4. Queue a full sync per account by setting its **Sync Stage** to **Queued**.

## Development

- `yarn typecheck`
- `yarn test`: unit tests for mapping and the webhook signature
