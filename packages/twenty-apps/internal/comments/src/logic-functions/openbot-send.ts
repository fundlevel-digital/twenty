import { isNonEmptyString } from '@sniptt/guards';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { getOpenBotConnections } from '../openbot/connections';
import { getOpenBotDeliveryId } from '../openbot/tasks';
import { type CommentRequest } from '../types';
import { commentsHandler } from './comments';

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
  const result = await commentsHandler(
    {
      body: {
        action: 'create',
        objectName: input.objectName,
        recordId: input.recordId,
        body: `@${connection.name} ${input.prompt}`,
        mentions: [
          {
            id: connection.id,
            label: connection.name,
            objectName: 'openbotAgent',
          },
        ],
      },
    } as RoutePayload<CommentRequest>,
    context,
  );
  if (Array.isArray(result) || !('comments' in result))
    throw new Error('OpenBot request could not be created');
  const comment = result.comments.at(-1);
  if (!comment) throw new Error('OpenBot request could not be created');
  const requestId = getOpenBotDeliveryId(comment.id, connection.id);
  if (result.openBotDeliveryFailed)
    throw new Error(
      `Comment saved, but OpenBot could not be queued. Request: ${requestId}`,
    );
  return { requestId, status: 'pending', commentId: comment.id };
};

export default defineLogicFunction({
  universalIdentifier: '54d21432-6a55-4ca8-8f58-bd859d74154f',
  name: 'openbot-send',
  description:
    'Send a prompt to an enrolled OpenBot agent in a record comment thread.',
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
