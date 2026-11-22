import { isNonEmptyString } from '@sniptt/guards';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { getOpenBotConnections } from '../openbot/connections';
import { getOpenBotDeliveryId } from '../openbot/tasks';
import { randomUUID } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';
import { sourceKey } from '../openbot/messages';
import { queueOpenBotMentions } from '../openbot/queue-comment';
import {
  getRecordObjects,
  readRecordTarget,
} from '../utils/read-record-target';

type SendInput = {
  agentId: string;
  objectName: string;
  recordId: string;
  prompt: string;
};

export const sendToOpenBot = async (
  input: SendInput,
  context: LogicFunctionExecutionContext,
) => {
  if (!context.workspaceMemberId)
    throw new Error('Run this action as a workspace member');
  if (
    !isNonEmptyString(input.prompt) ||
    !input.prompt.trim() ||
    input.prompt.length > 9500
  )
    throw new Error('Write a prompt of up to 9,500 characters');
  const connection = (await getOpenBotConnections()).find(
    ({ id }) => id === input.agentId,
  );
  if (!connection) throw new Error('Select an enrolled OpenBot agent');
  const { recordLabel } = await readRecordTarget(
    input,
    await getRecordObjects(),
  );
  const commentId = randomUUID();
  const comment = {
    id: commentId,
    body: input.prompt.trim(),
    parentId: null,
    authorId: context.workspaceMemberId,
    authorName: 'Workflow',
    authorKind: 'HUMAN',
    targetObject: input.objectName,
    targetRecordId: input.recordId,
    deleted: false,
    resolved: false,
    mentions: '[]',
    createdAt: new Date().toISOString(),
  };
  await kv.set(sourceKey(commentId), comment);
  await queueOpenBotMentions(
    comment,
    [{ id: connection.id, objectName: 'openbotAgent' }],
    recordLabel,
  );
  return {
    requestId: getOpenBotDeliveryId(commentId, connection.id),
    status: 'pending',
    commentId,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'aad98a9e-ffc5-52bd-813a-8101633fb9ef',
  name: 'openbot-send',
  description: 'Send a record-scoped prompt to an enrolled OpenBot agent.',
  timeoutSeconds: 30,
  handler: sendToOpenBot,
  workflowActionTriggerSettings: {
    label: 'Send to OpenBot',
    icon: 'IconTool',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        objectName: { type: 'string', description: 'Object Name' },
        recordId: { type: 'string', description: 'Record ID' },
        prompt: { type: 'string', description: 'Prompt' },
      },
      required: ['agentId', 'objectName', 'recordId', 'prompt'],
      additionalProperties: false,
    }),
    outputSchema: [
      {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          status: { type: 'string' },
          commentId: { type: 'string' },
        },
      },
    ],
  },
});
