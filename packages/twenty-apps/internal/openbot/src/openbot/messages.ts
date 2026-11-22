import { createHash } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';
import { graphql } from '../utils/graphql';
import { type BotMessage } from '../types';
import { getOpenBotReplyId, type OpenBotDelivery } from './tasks';
import { openBotDeliveryKey } from './queue-comment';
export const sourceKey = (id: string) => `openbot:source:${id}`;
export const replyKey = (id: string) => `openbot:reply:${id}`;
const scopeKey = (objectName: string, recordId: string) =>
  createHash('sha256').update(`${objectName}:${recordId}`).digest('hex');
export const rememberRequest = async (delivery: OpenBotDelivery) => {
  const id = getOpenBotReplyId(`receipt:${delivery.id}`);
  const { botRequests } = await graphql<{
    botRequests: { edges: { node: { id: string } }[] };
  }>(
    'query($id:UUID!){botRequests(filter:{id:{eq:$id}},first:1){edges{node{id}}}}',
    { id },
    true,
  );
  if (botRequests.edges.length) return;
  try {
    await graphql(
      'mutation($data:BotRequestCreateInput!){createBotRequest(data:$data){id}}',
      {
        data: {
          id,
          name: 'Bot Request',
          scopeKey: scopeKey(delivery.task.objectName, delivery.task.recordId),
          deliveryId: delivery.id,
        },
      },
      true,
    );
  } catch (error) {
    const duplicate = await graphql<{ botRequests: { edges: unknown[] } }>(
      'query($id:UUID!){botRequests(filter:{id:{eq:$id}},first:1){edges{node{id}}}}',
      { id },
      true,
    );
    if (!duplicate.botRequests.edges.length) throw error;
  }
};
export const readRecordRequests = async (
  objectName: string,
  recordId: string,
) => {
  const deliveries: OpenBotDelivery[] = [];
  let after: string | null = null;
  do {
    const page: {
      botRequests: {
        edges: { node: { deliveryId: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } = await graphql(
      'query($scope:String!,$after:String){botRequests(filter:{scopeKey:{eq:$scope}},first:100,after:$after){edges{node{deliveryId}}pageInfo{hasNextPage endCursor}}}',
      { scope: scopeKey(objectName, recordId), after },
      true,
    );
    for (const { node } of page.botRequests.edges) {
      const delivery = await kv.get<OpenBotDelivery>(
        openBotDeliveryKey(node.deliveryId),
      );
      if (delivery) deliveries.push(delivery);
    }
    after = page.botRequests.pageInfo.hasNextPage
      ? page.botRequests.pageInfo.endCursor
      : null;
  } while (after);
  return deliveries;
};
export const readRecordMessages = async (
  objectName: string,
  recordId: string,
) => {
  const messages = new Map<string, BotMessage>();
  for (const delivery of await readRecordRequests(objectName, recordId)) {
    const source = await kv.get<BotMessage>(sourceKey(delivery.task.commentId));
    if (source) messages.set(source.id, source);
    const reply = await kv.get<BotMessage>(replyKey(delivery.id));
    if (reply) messages.set(reply.id, reply);
  }
  return [...messages.values()];
};
