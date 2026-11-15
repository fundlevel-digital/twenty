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

## Setup

1. `yarn install`, then deploy with the `twenty` CLI to the workspace.
2. In the app's settings, set:
   - `UNIPILE_API_KEY`: a Unipile v2 key
   - `UNIPILE_WEBHOOK_SECRET`: the signing secret of the webhook endpoint created in step 3
3. In Unipile, add a webhook endpoint at `https://<twenty-server>/s/linkedin/unipile-webhook` for the account, message, receipt, reaction and relation events.
4. Queue a full sync per account by setting its **Sync Stage** to **Queued**.

## Development

- `yarn typecheck`
- `yarn test`: unit tests for mapping and the webhook signature
