import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  RetryableLogicFunctionError,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';

import { OPENBOT_DELIVER_FUNCTION_IDENTIFIER } from '../openbot/constants';

import { getOpenBotConnections } from '../openbot/connections';
import { openBotDeliveryKey } from '../openbot/queue-comment';
import { sendOpenBotTask } from '../openbot/send-task';
import { getOpenBotReplySecret, type OpenBotDelivery } from '../openbot/tasks';
import { graphql } from '../utils/graphql';

export const deliverOpenBotTask = async (
  { deliveryId }: { deliveryId: string },
  context: LogicFunctionExecutionContext,
) => {
  const delivery = await kv.get<OpenBotDelivery>(
    openBotDeliveryKey(deliveryId),
  );
  if (
    !delivery ||
    delivery.status === 'replied' ||
    delivery.status === 'accepted' ||
    delivery.expiresAt < Date.now()
  ) {
    return { skipped: true };
  }
  const connection = getOpenBotConnections().find(
    ({ id }) => id === delivery.task.agentId,
  );
  if (!connection) throw new Error('OpenBot agent is no longer connected');
  const { recordComments } = await graphql<{
    recordComments: {
      edges: {
        node: {
          id: string;
          deleted: boolean;
          resolved: boolean;
          authorKind: string | null;
        };
      }[];
    };
  }>(
    'query($filter: RecordCommentFilterInput!) { recordComments(filter: $filter, first: 2) { edges { node { id deleted resolved authorKind } } } }',
    {
      filter: { id: { in: [delivery.task.commentId, delivery.task.threadId] } },
    },
    true,
  );
  const source = recordComments.edges.find(
    ({ node }) => node.id === delivery.task.commentId,
  )?.node;
  const parent = recordComments.edges.find(
    ({ node }) => node.id === delivery.task.threadId,
  )?.node;
  if (
    !source ||
    source.deleted ||
    source.authorKind === 'BOT' ||
    !parent ||
    parent.deleted ||
    parent.resolved
  ) {
    await kv.set(openBotDeliveryKey(deliveryId), {
      ...delivery,
      status: 'failed',
    });
    return { skipped: true };
  }
  try {
    await sendOpenBotTask(
      connection,
      delivery.task,
      getOpenBotReplySecret(connection, context.workspaceId, deliveryId),
    );
    const latest = await kv.get<OpenBotDelivery>(
      openBotDeliveryKey(deliveryId),
    );
    if (latest?.status !== 'replied')
      await kv.set(openBotDeliveryKey(deliveryId), {
        ...delivery,
        status: 'accepted',
      });
    return { accepted: true };
  } catch {
    const latest = await kv.get<OpenBotDelivery>(
      openBotDeliveryKey(deliveryId),
    );
    if (latest?.status !== 'replied')
      await kv.set(openBotDeliveryKey(deliveryId), {
        ...delivery,
        status: context.retryCount < context.maxRetries ? 'retrying' : 'failed',
      });
    throw new RetryableLogicFunctionError(
      'OpenBot is unavailable. Delivery will retry with the same event ID.',
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: OPENBOT_DELIVER_FUNCTION_IDENTIFIER,
  name: 'openbot-deliver',
  description: 'Delivers signed comment mentions to OpenBot routines.',
  timeoutSeconds: 30,
  handler: deliverOpenBotTask,
});
