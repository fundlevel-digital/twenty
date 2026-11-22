import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { openBotDeliveryKey } from '../openbot/queue-comment';
import { type OpenBotDelivery } from '../openbot/tasks';
import { replyKey } from '../openbot/messages';
import {
  getRecordObjects,
  readRecordTarget,
} from '../utils/read-record-target';
import { type BotMessage } from '../types';

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
  await readRecordTarget(
    { objectName: delivery.task.objectName, recordId: delivery.task.recordId },
    await getRecordObjects(),
  );
  const savedReply = await kv.get<BotMessage>(replyKey(delivery.id));
  const status =
    delivery.status !== 'replied' && delivery.expiresAt <= Date.now()
      ? 'failed'
      : delivery.status;
  const answer = status === 'replied' ? (savedReply?.body ?? null) : null;
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
  universalIdentifier: '7b3c1aaf-bcb1-5027-a884-eb3ba8a515ba',
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
