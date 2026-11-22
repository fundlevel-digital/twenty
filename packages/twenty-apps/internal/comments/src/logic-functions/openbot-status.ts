import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { openBotDeliveryKey } from '../openbot/queue-comment';
import { getOpenBotReplyId, type OpenBotDelivery } from '../openbot/tasks';
import { type CommentRequest } from '../types';
import { commentsHandler } from './comments';

export const getOpenBotRequestStatus = async (
  { requestId }: { requestId: string },
  context: LogicFunctionExecutionContext,
) => {
  if (!context.workspaceMemberId)
    throw new Error('Run this action as a workspace member');
  if (!/^[0-9a-f-]{36}:[0-9a-f-]{36}$/i.test(requestId))
    throw new Error('Select an OpenBot request');
  const delivery = await kv.get<OpenBotDelivery>(openBotDeliveryKey(requestId));
  if (!delivery) throw new Error('OpenBot request unavailable');
  const result = await commentsHandler(
    {
      body: {
        action: 'list',
        objectName: delivery.task.objectName,
        recordId: delivery.task.recordId,
      },
    } as RoutePayload<CommentRequest>,
    context,
  );
  if (
    Array.isArray(result) ||
    !('comments' in result) ||
    !result.comments.some(
      ({ id, deleted }) => id === delivery.task.commentId && !deleted,
    )
  )
    throw new Error('OpenBot request unavailable');
  const status =
    delivery.status !== 'replied' && delivery.expiresAt <= Date.now()
      ? 'failed'
      : delivery.status;
  const answer =
    status === 'replied'
      ? (result.comments.find(
          ({ id, deleted }) => id === getOpenBotReplyId(requestId) && !deleted,
        )?.body ?? null)
      : null;
  return {
    requestId,
    status,
    answer,
    failureReason:
      status === 'failed'
        ? 'The request failed, expired, or its source thread is no longer open.'
        : null,
  };
};

export default defineLogicFunction({
  universalIdentifier: '7bb378b9-fdab-47d2-8e66-b204803630d0',
  name: 'openbot-status',
  description:
    'Read delivery status and the completed answer after checking record access.',
  timeoutSeconds: 30,
  handler: getOpenBotRequestStatus,
  workflowActionTriggerSettings: {
    label: 'Get Request Status',
    icon: 'IconTool',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: { requestId: { type: 'string', description: 'Request ID' } },
      required: ['requestId'],
      additionalProperties: false,
    }),
    outputSchema: [
      {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          status: { type: 'string' },
          answer: { type: 'string' },
          failureReason: { type: 'string' },
        },
      },
    ],
  },
});
