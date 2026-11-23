# OpenBot

Standalone Twenty app for bot identities, webhook settings, record-scoped
requests and Task notifications. Uses the supplied OpenBot artwork unchanged.

Open **Settings → Apps → OpenBot → Bots** for the bot directory. Each bot has
its own configuration page for webhook URL, signing secret, avatar, enabled
state and assignment/due/overdue notification policy.

See [setup, ownership and webhook protocol](src/openbot/README.md). Comments is
optional; the app's Send/Get Status workflow actions and Task automations work
independently. The native Task assignee integration uses the focused host adapter
in `twenty-front/src/modules/openbot`. Native Inbox mentions also require
the shared external-assistant engine and UI support in this branch.
A stock host can store `botAssignees` through the native data API, but needs that
adapter for the integrated human-and-bot picker.

Bots are native Twenty **Agents** and appear as **Agent · OpenBot** in the native Inbox mention picker.
Selecting a bot sends the current message to its webhook; its signed reply
returns to that conversation under its own identity. See the
[native Agent handoff](../../../../docs/handoffs/2026-11-23-openbot-native-agent-runtime.md).
The **Run OpenBot Agent** workflow action uses the native `runAgent()` API with
the initiating member’s permissions. OpenBot executes the request; Twenty
requires no model provider for it.

Only the OpenBot webhook adapter is implemented. The Bots model is separate from
human login accounts; future providers can extend its native Provider Select and
adapter registry. No live OpenBot is configured or modified by installing this
app; routines are configured manually.

```sh
yarn install --immutable
yarn test
yarn typecheck
yarn twenty app build
```
