# Google Groups For Twenty

Google Workspace-backed shared email channels. The app reads Group messages delivered to a connected Gmail account, stores them as native Twenty Messages and Message Threads, and sends replies through verified Gmail Send Mail As addresses. It does not connect directly to a Google Groups archive or synchronize Google Calendar.

## Configure

1. Enable the Gmail API in Google Cloud. Create an OAuth **Web Application** client and configure its consent screen for your Workspace users. An Internal app is appropriate only when the project and users belong to the same Google Workspace organization. External/Testing clients require test users and may have refresh-token restrictions.
2. Register the exact callback `https://<your-twenty-origin>/auth/apps/callback`. The Sunny preview callback is `https://fundlevel-w935.conductor.show/auth/apps/callback`.
3. Under the Google Groups developer registration’s **Config → Server Variables**, enter `GOOGLE_GROUPS_CLIENT_ID` and `GOOGLE_GROUPS_CLIENT_SECRET`. Keep these values out of source control. OAuth credentials under a registration’s OAuth tab concern access to Twenty, not these Google credentials.
4. Open the installed app’s **General** tab and connect **Google Workspace**. The app requests Gmail read, send and Send Mail As settings access, with offline access and PKCE. Twenty stores and refreshes the connection credentials.
5. In **Group Channels**, choose that account. Add each exact Group address and channel name, choose its sharing level and save. Configuration can be drafted while disconnected and paused.
6. Each Google Group must deliver **Each Email** to the connected account. For replies, configure and verify the corresponding address in Gmail’s **Send Mail As** settings.
7. Choose **Create Missing Contacts**: Never (the default), Senders Only, Recipients Only, or Everyone. Recipients includes To, Cc and Bcc. Existing People are matched regardless of this choice.
8. Select a history window, unpause, save and use **Sync Now**. Saving never starts an immediate import. The app’s native cron processes another batch every five minutes when scheduled execution is enabled.

No provider credentials or Group selections are supplied automatically. The initial state is empty and paused. Google configuration and a live OAuth round trip are not verified merely by installation.

## Behavior And Boundaries

- One selected Google connection feeds the configured Group channels. Only enabled, exactly matched addresses or Group List-ID headers are ingested. Spam, trash and drafts are excluded. Recipient and Group headers are checked again after Google search; a search match alone is insufficient.
- Full backfill is paginated, then Gmail history IDs track new mail and label additions. An expired history cursor restarts the selected backfill window. A failed page does not advance its cursor. Replays reuse stable Group/message IDs.
- Message IDs and thread IDs include the Group’s stable ID. A message addressed to multiple configured Groups can appear in each channel. It is not automatically shared with an unconfigured Group.
- Existing People are linked only when a primary-email match is unambiguous. Contact creation is opt-in by participant role; ambiguous matches remain unlinked and never create another Person. New People use stable email-based identifiers for retries. Existing People are never overwritten. The connected mailbox, its Gmail Send Mail As identities and all configured Group addresses are excluded. The policy applies during subsequent imports, including backfill; saving changed preferences starts a fresh backfill revision.
- Plain text is preferred, HTML is converted to text, and attachments up to 20 MB are uploaded to native attachment storage. Each Group receives its own uploaded attachment files. Extensionless filenames use an internal `.bin` upload suffix while retaining their original displayed label.
- A shared Workspace connection is usable by Workspace members with native email-send permission. Visibility controls how much other members can read: Participants Only, Subject And Participants, or Full Message. The connection owner retains full visibility. These are **not** Google Group membership ACLs.
- Pausing stops imports and replies. Disabling/removing a Group stops processing and preserves existing history. Sharing changes affect existing messages. Changing a saved Group’s email requires removing it and adding a new Group. Saving a changed configuration starts a fresh backfill revision.
- Replies verify the selected Group against Gmail’s accepted Send Mail As identities, preserve Google thread IDs and MIME reply headers, and use Twenty’s native reply UI. Native sending permissions are enforced by Twenty before the handler runs. MIME is composed by Nodemailer, including Bcc recipients and attachments.
- A recorded successful delivery returns its saved result for repeated delivery keys. An uncertain delivery is not automatically sent again with the same key. Check Gmail before making another send attempt. Google does not provide an exactly-once delivery guarantee for this integration.
- Imported history is a snapshot of mail present in the connected Gmail mailbox. Groups-only archive messages, deletions and read/unread changes are not synchronized. Calendar events and Google Group member lists are outside this app’s scope.

## Inbox Views

**Google Groups → All Group Emails** lists received conversations in Twenty's
native table, with From, Group, Received and Attachments columns. Rows open the
native conversation side panel with its original sender, To/Cc, history,
attachments and reply controls. The latest received message supplies the sender
and date; the attachment count totals received messages in that conversation.
Replayed and older messages do not inflate the count or move the date backwards.
Mail sent from the Group address does not enter received-mail summaries.

Use the Group filter to browse one mailbox. The Fundlevel preview also has Team,
Ops and Creators Inbox shortcuts generated from its saved configuration. These
workspace-specific views live only in the ignored preview fixture. Tracked app
source provides the reusable All Group Emails view and does not contain workspace
addresses. Existing preview messages populate the summary fields through the
normal APIs; later imports maintain them without duplicating message records.

## Preview

This app is installed in isolated Sunny and Fundlevel VM previews. The active public preview now opens [Fundlevel](../../../../docs/handoffs/2026-11-22-fundlevel-google-groups-preview.md); Sunny's configuration is preserved separately. The regular preview workers exclude integration cron execution, so automatic provider jobs are not enabled globally. The app initially starts paused and manual Sync Now is available after configuration. After the owner connected Google and configured Fundlevel's Groups, the authorized All History backfill accounted for 353 distinct Gmail messages in 372 Group-scoped entries, 124 attachments and 40 new People. All pages completed and a subsequent incremental sync was idle without errors. Outbound delivery remains unverified. Some contacts with no supplied display name appear as Untitled; their participant email is preserved.

The app is independent of the earlier synthetic **Google Channel Verification** fixture. That fixture is not a working Google connector and does not provide credentials to this app.

## Development

```sh
cd packages/twenty-apps/public/google-groups
corepack yarn install --immutable
corepack yarn typecheck
corepack yarn lint
corepack yarn test
corepack yarn twenty app build
```

Use a dedicated preview remote. Review plans and apply with `--no-prune`; do not uninstall other apps or reset workspace data to repair a development connection.

References: [Gmail synchronization](https://developers.google.com/workspace/gmail/api/guides/sync), [reply threading](https://developers.google.com/workspace/gmail/api/guides/threads), [Send Mail As identities](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs).
