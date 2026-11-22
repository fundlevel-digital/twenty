import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { rememberRequest } from './messages';
import { kv } from 'twenty-sdk/logic-function';

import { OPENBOT_DELIVER_FUNCTION_IDENTIFIER } from './constants';

import { getOpenBotConnections } from './connections';
import { getOpenBotDeliveryId, type OpenBotDelivery } from './tasks';

export const openBotDeliveryKey = (deliveryId: string): string =>
  `openbot:delivery:${deliveryId}`;

type CommentForOpenBot = {
  id: string;
  body: string;
  parentId: string | null;
  authorId: string;
  authorKind?: string | null;
  targetObject: string;
  targetRecordId: string;
};

export const queueOpenBotMentions = async (
  comment: CommentForOpenBot,
  mentions: { id: string; objectName: string }[],
  recordLabel: string,
): Promise<boolean> => {
  if (comment.authorKind === 'BOT') return false;
  const connections = getOpenBotConnections();
  const agentIds = [
    ...new Set(
      mentions
        .filter(({ objectName }) =>
          ['bot', 'openbotAgent'].includes(objectName),
        )
        .map(({ id }) => id),
    ),
  ];
  const selected = connections.filter(({ id }) => agentIds.includes(id));
  if (selected.length === 0) return false;
  const replyUrl = process.env.OPENBOT_REPLY_URL;
  if (!replyUrl || new URL(replyUrl).protocol !== 'https:') {
    throw new Error(
      'Configure the HTTPS OpenBot reply URL before mentioning agents',
    );
  }
  const deliveries = selected.map((connection): OpenBotDelivery => ({
    id: getOpenBotDeliveryId(comment.id, connection.id),
    status: 'pending',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    task: {
      agentId: connection.id,
      commentId: comment.id,
      threadId: comment.parentId ?? comment.id,
      objectName: comment.targetObject,
      recordId: comment.targetRecordId,
      recordLabel,
      requestedBy: comment.authorId,
      text: comment.body,
      replyUrl,
    },
  }));
  for (const delivery of deliveries) {
    if (!(await kv.get(openBotDeliveryKey(delivery.id))))
      await kv.set(openBotDeliveryKey(delivery.id), delivery);
    await rememberRequest(delivery);
  }
  await new MetadataApiClient({ runAs: 'application' }).mutation({
    enqueueJobs: {
      __args: {
        input: {
          logicFunctionUniversalIdentifier: OPENBOT_DELIVER_FUNCTION_IDENTIFIER,
          jobs: deliveries.map(({ id }) => ({
            jobId: `openbot-${id.replaceAll(':', '-')}`,
            payload: { deliveryId: id },
          })),
          retryLimit: 10,
        },
      },
      enqueued: true,
    },
  });
  return true;
};
