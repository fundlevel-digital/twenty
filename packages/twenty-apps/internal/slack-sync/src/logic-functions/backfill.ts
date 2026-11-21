import { loadContactPreferences } from 'src/utils/contact-preferences';
import { ingestSlackMessage } from 'src/utils/ingest-message';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  listMessageChannels,
  listMessageFolders,
  kv,
} from 'twenty-sdk/logic-function';
import { BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';
import {
  slackRequest,
  SlackRateLimitError,
  type SlackMessage,
} from 'src/utils/slack';
import { enqueue } from 'src/utils/queue';
import { mapMessage, type MappingCache } from 'src/utils/map-message';

export type BackfillPayload = {
  connectedAccountId: string;
  channelId: string;
  oldest: string;
  latest: string;
  cursor?: string;
  threadTimestamp?: string;
};
export const backfill = async (payload: BackfillPayload) => {
  const connection = await getConnection(payload.connectedAccountId);
  const [channel] = await listMessageChannels({
    connectedAccountId: connection.id,
  });
  if (!connection.accessToken || !channel?.isSyncEnabled) return;
  const folder = (
    await listMessageFolders({ messageChannelId: channel.id })
  ).find(
    (folder) => folder.externalId === payload.channelId && folder.isSynced,
  );
  if (!folder) return;
  const teamId = connection.externalAccountId?.split(':')[0];
  if (!teamId) throw new Error('Missing Slack team');
  try {
    const page = await slackRequest<{
      messages: SlackMessage[];
      response_metadata?: { next_cursor?: string };
    }>(
      connection.accessToken,
      payload.threadTimestamp
        ? 'conversations.replies'
        : 'conversations.history',
      {
        channel: payload.channelId,
        oldest: payload.oldest,
        latest: payload.latest,
        limit: '20',
        cursor: payload.cursor ?? '',
        ...(payload.threadTimestamp ? { ts: payload.threadTimestamp } : {}),
      },
    );
    const cache: MappingCache = new Map();
    const { employeeDomains } = await loadContactPreferences(
      connection.userWorkspaceId,
    );
    for (const message of page.messages) {
      if (!message.user && !message.bot_id) continue;
      await ingestSlackMessage(
        channel.id,
        await mapMessage({
          token: connection.accessToken,
          teamId,
          channelId: payload.channelId,
          message,
          subject: folder.name,
          cache,
          employeeDomains,
        }),
        { token: connection.accessToken, files: message.files ?? [] },
      );
      if (!payload.threadTimestamp && message.reply_count)
        await enqueue(BACKFILL_UNIVERSAL_IDENTIFIER, {
          ...payload,
          cursor: undefined,
          threadTimestamp: message.ts,
        });
    }
    const cursor = page.response_metadata?.next_cursor;
    if (cursor)
      await enqueue(BACKFILL_UNIVERSAL_IDENTIFIER, { ...payload, cursor });
    else if (!payload.threadTimestamp)
      await kv.set(`imported:${connection.id}:${payload.channelId}`, true);
  } catch (error) {
    if (!(error instanceof SlackRateLimitError)) throw error;
    await enqueue(
      BACKFILL_UNIVERSAL_IDENTIFIER,
      payload,
      undefined,
      error.delayMs,
    );
  }
};
export default defineLogicFunction({
  universalIdentifier: BACKFILL_UNIVERSAL_IDENTIFIER,
  name: 'slack-import-history',
  timeoutSeconds: 900,
  handler: backfill,
});
