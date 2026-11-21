import { upsertSlackChannel } from 'src/utils/slack-channel';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  listConnections,
  listMessageChannels,
  listMessageFolders,
  syncMessageFolders,
  kv,
} from 'twenty-sdk/logic-function';
import {
  DISCOVER_UNIVERSAL_IDENTIFIER,
  BACKFILL_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';
import {
  slackRequest,
  SlackRateLimitError,
  type SlackConversation,
} from 'src/utils/slack';
import { enqueue } from 'src/utils/queue';

export const discover = async ({
  connectedAccountId,
  cursor = '',
}: { connectedAccountId?: string; cursor?: string } = {}) => {
  if (!connectedAccountId) {
    for (const connection of await listConnections({
      providerName: 'slack-sync',
    })) {
      if (!connection.authFailedAt)
        await enqueue(DISCOVER_UNIVERSAL_IDENTIFIER, {
          connectedAccountId: connection.id,
        });
    }
    return;
  }
  const connection = await getConnection(connectedAccountId);
  const [channel] = await listMessageChannels({ connectedAccountId });
  if (!connection.accessToken || !channel?.isSyncEnabled) return;
  try {
    const page = await slackRequest<{
      channels: SlackConversation[];
      response_metadata?: { next_cursor?: string };
    }>(connection.accessToken, 'users.conversations', {
      types: 'public_channel,private_channel,im,mpim',
      exclude_archived: 'true',
      limit: '20',
      cursor,
    });
    const conversations = page.channels;
    const existing = await listMessageFolders({ messageChannelId: channel.id });
    const folders: {
      externalId: string;
      name: string;
      isSynced?: boolean;
      applicationRecordId?: string;
    }[] = [];
    for (const conversation of conversations) {
      const { channel: detail } = await slackRequest<{
        channel: SlackConversation;
      }>(connection.accessToken, 'conversations.info', {
        channel: conversation.id,
      });
      const teamId = connection.externalAccountId?.split(':')[0];
      const applicationRecordId = teamId
        ? await upsertSlackChannel(teamId, detail)
        : undefined;
      const current = existing.find(
        (folder) => folder.externalId === detail.id,
      );
      folders.push({
        externalId: detail.id,
        ...(applicationRecordId ? { applicationRecordId } : {}),
        name:
          detail.name ??
          (detail.is_im ? `DM ${detail.user ?? detail.id}` : detail.id),
        ...(current ? {} : { isSynced: detail.is_ext_shared === true }),
      });
    }
    const input = { messageChannelId: channel.id, folders, isPartial: true };
    const synced = await syncMessageFolders(input);
    for (const folder of synced.filter((folder) => folder.isSynced)) {
      const key = `imported:${connectedAccountId}:${folder.externalId}`;
      if (!(await kv.get(key))) {
        await enqueue(
          BACKFILL_UNIVERSAL_IDENTIFIER,
          {
            connectedAccountId,
            channelId: folder.externalId,
            oldest: String((Date.now() - 30 * 86400000) / 1000),
            latest: String(Date.now() / 1000),
          },
          `slack-initial:${connectedAccountId}:${folder.externalId}`,
        );
      }
    }
    if (page.response_metadata?.next_cursor)
      await enqueue(DISCOVER_UNIVERSAL_IDENTIFIER, {
        connectedAccountId,
        cursor: page.response_metadata.next_cursor,
      });
  } catch (error) {
    if (!(error instanceof SlackRateLimitError)) throw error;
    await enqueue(
      DISCOVER_UNIVERSAL_IDENTIFIER,
      { connectedAccountId, cursor },
      undefined,
      error.delayMs,
    );
  }
};
export default defineLogicFunction({
  universalIdentifier: DISCOVER_UNIVERSAL_IDENTIFIER,
  name: 'slack-discover-conversations',
  timeoutSeconds: 900,
  handler: discover,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
});
