import { isString, isObject } from '@sniptt/guards';
import { kv } from 'twenty-sdk/logic-function';

import { getOpenBotConnections } from './connections';
import { openBotDeliveryKey } from './queue-comment';
import { getOpenBotDeliveryId, type OpenBotDelivery } from './tasks';

export type OpenBotDeliveryStatus = {
  commentId: string;
  agentId: string;
  status: OpenBotDelivery['status'];
};

export const getOpenBotDeliveryStatuses = async (
  comments: { id: string; mentions: string; deleted: boolean }[],
): Promise<OpenBotDeliveryStatus[]> => {
  const connectedIds = new Set(getOpenBotConnections().map(({ id }) => id));
  const tasks: { commentId: string; agentId: string }[] = [];
  for (const comment of comments
    .filter(({ deleted }) => !deleted)
    .slice(-100)) {
    let mentions: unknown;
    try {
      mentions = JSON.parse(comment.mentions || '[]');
    } catch {
      continue;
    }
    if (!Array.isArray(mentions)) continue;
    for (const mention of mentions) {
      if (
        isObject<Record<string, unknown>, unknown>(mention) &&
        mention.objectName === 'openbotAgent' &&
        isString(mention.id) &&
        connectedIds.has(mention.id)
      ) {
        tasks.push({ commentId: comment.id, agentId: mention.id });
      }
    }
  }
  const statuses = await Promise.all(
    tasks.map(async ({ commentId, agentId }) => {
      const delivery = await kv.get<OpenBotDelivery>(
        openBotDeliveryKey(getOpenBotDeliveryId(commentId, agentId)),
      );
      return {
        commentId,
        agentId,
        status: delivery?.status ?? ('failed' as const),
      };
    }),
  );
  return statuses;
};
