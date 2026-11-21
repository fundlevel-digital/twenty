import { loadContactPreferences } from 'src/utils/contact-preferences';
import { ingestSlackMessage } from 'src/utils/ingest-message';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  listConnections,
  getConnection,
  listMessageChannels,
  listMessageFolders,
  kv,
} from 'twenty-sdk/logic-function';
import { EVENT_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';
import { type SlackEnvelope } from 'src/logic-functions/webhook';
import {
  slackRequest,
  slackIdentity,
  timestampDate,
  SlackRateLimitError,
  type SlackMessage,
} from 'src/utils/slack';
import { updateMessages } from 'src/utils/update-messages';
import { mapMessage } from 'src/utils/map-message';
import { enqueue } from 'src/utils/queue';

type EventPayload = SlackEnvelope & { connectedAccountId?: string };
export const handleEvent = async (payload: EventPayload) => {
  const { event, team_id: teamId } = payload;
  if (!event || !teamId) return;
  if (!payload.connectedAccountId) {
    // Slack's authorizations list is truncated; verify access separately for each token.
    for (const connection of await listConnections({
      providerName: 'slack-sync',
    })) {
      if (
        connection.externalAccountId?.startsWith(`${teamId}:`) &&
        !connection.authFailedAt
      )
        await enqueue(
          EVENT_UNIVERSAL_IDENTIFIER,
          { ...payload, connectedAccountId: connection.id },
          `slack-event:${payload.event_id}:${connection.id}`,
        );
    }
    return;
  }
  const connection = await getConnection(payload.connectedAccountId);
  const [channel] = await listMessageChannels({
    connectedAccountId: connection.id,
  });
  const conversationId = event.channel ?? event.item?.channel;
  const messageTimestamp =
    event.deleted_ts ?? event.message?.ts ?? event.item?.ts ?? event.ts;
  if (
    !connection.accessToken ||
    !channel?.isSyncEnabled ||
    !conversationId ||
    !messageTimestamp ||
    !connection.externalAccountId?.startsWith(`${teamId}:`)
  )
    return;
  const folder = (
    await listMessageFolders({ messageChannelId: channel.id })
  ).find((folder) => folder.externalId === conversationId && folder.isSynced);
  if (!folder) return;
  try {
    let cursor = '';
    let isMember = false;
    do {
      const page = await slackRequest<{
        members: string[];
        response_metadata?: { next_cursor?: string };
      }>(connection.accessToken, 'conversations.members', {
        channel: conversationId,
        cursor,
        limit: '200',
      });
      if (page.members.includes(connection.externalAccountId.split(':')[1])) {
        isMember = true;
        break;
      }
      cursor = page.response_metadata?.next_cursor ?? '';
    } while (cursor);
    if (!isMember) return;
    const updatedAt = timestampDate(
      event.event_ts ?? event.ts ?? messageTimestamp,
    );
    if (event.subtype === 'message_deleted') {
      await kv.set(
        `deleted:${slackIdentity(teamId, conversationId, messageTimestamp)}`,
        updatedAt,
      );
      await updateMessages({
        messageChannelId: channel.id,
        messages: [
          {
            externalId: slackIdentity(teamId, conversationId, messageTimestamp),
            providerMetadata: { deletedAt: updatedAt, updatedAt },
          },
        ],
      });
      return;
    }
    let message: SlackMessage | undefined;
    if (event.type === 'message')
      message =
        event.message ?? (event.ts ? { ...event, ts: event.ts } : undefined);
    else if (
      (event.type === 'reaction_added' || event.type === 'reaction_removed') &&
      event.item?.type === 'message'
    ) {
      const result = await slackRequest<{ messages: SlackMessage[] }>(
        connection.accessToken,
        'conversations.history',
        {
          channel: conversationId,
          latest: messageTimestamp,
          oldest: messageTimestamp,
          inclusive: 'true',
          limit: '1',
        },
      );
      message = result.messages.find(
        (message) => message.ts === messageTimestamp,
      );
      if (!message) {
        const parent = await slackRequest<{ message: SlackMessage }>(
          connection.accessToken,
          'reactions.get',
          {
            channel: conversationId,
            timestamp: messageTimestamp,
            full: 'true',
          },
        );
        message = parent.message;
      }
    }
    if (!message || (!message.user && !message.bot_id)) return;
    const { employeeDomains } = await loadContactPreferences(
      connection.userWorkspaceId,
    );
    const mapped = await mapMessage({
      employeeDomains,
      token: connection.accessToken,
      teamId,
      channelId: conversationId,
      message,
      subject: folder.name,
    });
    const updatedMessage = {
      ...mapped,
      providerMetadata: { ...mapped.providerMetadata, updatedAt },
    };
    await ingestSlackMessage(channel.id, updatedMessage, {
      token: connection.accessToken,
      files: message.files ?? [],
    });
  } catch (error) {
    if (!(error instanceof SlackRateLimitError)) throw error;
    await enqueue(
      EVENT_UNIVERSAL_IDENTIFIER,
      payload,
      undefined,
      error.delayMs,
    );
  }
};
export default defineLogicFunction({
  universalIdentifier: EVENT_UNIVERSAL_IDENTIFIER,
  name: 'slack-handle-event',
  timeoutSeconds: 900,
  handler: handleEvent,
});
