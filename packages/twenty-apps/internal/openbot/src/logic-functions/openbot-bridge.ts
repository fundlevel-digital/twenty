import { isObject, isString } from '@sniptt/guards';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { graphql } from '../utils/graphql';
import {
  getRecordObjects,
  readRecordTarget,
} from '../utils/read-record-target';
import { getPublicOpenBotAgents } from '../openbot/mentions';
import { queueOpenBotMentions } from '../openbot/queue-comment';
import {
  readRecordMessages,
  readRecordRequests,
  sourceKey,
} from '../openbot/messages';
import { type BotMessage } from '../types';

export const openBotBridge = async (
  request: RoutePayload<unknown>,
  context: LogicFunctionExecutionContext,
) => {
  const memberId = context.workspaceMemberId;
  if (!memberId) throw new Error('Sign in to use bots');
  const input = request.body;
  if (
    !isObject<Record<string, unknown>, unknown>(input) ||
    !isString(input.action)
  )
    throw new Error('Select a bot operation');
  if (input.action === 'directory') return getPublicOpenBotAgents();
  if (input.action === 'queue') {
    if (!isString(input.commentId)) throw new Error('Select a comment');
    const { recordComments } = await graphql<{
      recordComments: { edges: { node: BotMessage }[] };
    }>(
      'query($id:UUID!){recordComments(filter:{id:{eq:$id}},first:1){edges{node{id body parentId authorId authorKind:authorType targetObject targetRecordId mentions deleted}}}}',
      { id: input.commentId },
      true,
    );
    const comment = recordComments.edges[0]?.node;
    if (
      !comment ||
      comment.deleted ||
      comment.authorKind === 'BOT' ||
      comment.authorId !== memberId
    )
      throw new Error('Comment unavailable');
    const target = await readRecordTarget(
      { objectName: comment.targetObject, recordId: comment.targetRecordId },
      await getRecordObjects(),
    );
    const mentions: unknown = JSON.parse(comment.mentions);
    if (!Array.isArray(mentions)) throw new Error('Invalid recipients');
    return {
      queued: await queueOpenBotMentions(comment, mentions, target.recordLabel),
    };
  }
  if (!isString(input.objectName) || !isString(input.recordId))
    throw new Error('Select a record');
  await readRecordTarget(
    { objectName: input.objectName, recordId: input.recordId },
    await getRecordObjects(),
  );
  if (input.action === 'record') {
    const deliveries = await readRecordRequests(
      input.objectName,
      input.recordId,
    );
    return {
      comments: (
        await readRecordMessages(input.objectName, input.recordId)
      ).map((comment) => ({ ...comment, botOwned: true })),
      statuses: deliveries.map((delivery) => ({
        commentId: delivery.task.commentId,
        agentId: delivery.task.agentId,
        status: delivery.status,
      })),
    };
  }
  if (input.action === 'resolve' || input.action === 'delete') {
    if (!isString(input.id)) throw new Error('Select a bot thread');
    const source = await kv.get<BotMessage>(sourceKey(input.id));
    if (
      !source ||
      source.targetObject !== input.objectName ||
      source.targetRecordId !== input.recordId ||
      source.parentId
    )
      throw new Error('Bot thread unavailable');
    if (input.action === 'delete' && source.authorId !== memberId)
      throw new Error('Only the author can delete this comment');
    if (input.action === 'resolve' && typeof input.resolved !== 'boolean')
      throw new Error('Choose a thread state');
    await kv.set(
      sourceKey(source.id),
      input.action === 'delete'
        ? { ...source, deleted: true, body: '' }
        : { ...source, resolved: input.resolved },
    );
    return { saved: true };
  }
  throw new Error('Unsupported bot operation');
};
export default defineLogicFunction({
  universalIdentifier: '3a97b9fb-c3c1-4403-a81a-039884333d7f',
  name: 'openbot-bridge',
  description:
    'Optional authenticated record integration; never exposes credentials.',
  handler: openBotBridge,
  timeoutSeconds: 90,
  httpRouteTriggerSettings: {
    path: '/openbot/bridge',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
