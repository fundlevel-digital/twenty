# 0015. Select DMs And Channels Together In Sync Settings

- Date: 2026-11-21
- Status: accepted
- Decided by: Kareem
- Area: Slack

## Context

The app's history-import menu listed only conversations already selected for sync,
with generic account prefixes and raw Slack user IDs. It started one historical
import per action and did not offer a consolidated sync selection screen.

## Exchange

- 2026-11-21 Kareem: "What is this import thing? And why is it only showing 3 channels?"
- 2026-11-21 Kareem: "Need to be formatted better"
- 2026-11-21 Kareem: "Bruh why do I have to config these one at a time..."
- 2026-11-21 Kareem: "Ther should jsut be good settings that let me select which DMs / Channels to sync"
- 2026-11-21 Agent: found 82 discovered conversations and 36 selected in production, then replaced the one-conversation menu with a searchable bulk selection list.

## Decision

Provide one native Sync settings screen for choosing channels and DMs together.
Use readable channel and person names, search, conversation-type filtering, bulk
selection and one Save Sync Settings action. A shared history setting starts
historical imports for selected conversations automatically.

## Why

The owner wants to choose what syncs without repeatedly configuring individual
imports. Showing only existing selections hid the other available conversations.

## Consequences

The list includes selected and unselected discovered conversations. Discovery
resolves DM participants and updates the list while running. Changing selection
uses native message-folder settings and queues history jobs in batches; it does
not delete previously imported messages or change another member's selection.

The old history route remains for compatibility, but the preferences screen no
longer uses it. New discovery retains existing selections. The app does not
silently select every private conversation on the owner's behalf.

## Evidence

- [Selection screen](../../../packages/twenty-apps/internal/slack-sync/src/front-components/components/SlackConversationSettings.tsx)
- [Member settings endpoint](../../../packages/twenty-apps/internal/slack-sync/src/logic-functions/settings.ts)
- [Conversation discovery](../../../packages/twenty-apps/internal/slack-sync/src/logic-functions/discover.ts)
- [Deployment verification](../../handoffs/2026-11-21-live-crm-rollout.md)
