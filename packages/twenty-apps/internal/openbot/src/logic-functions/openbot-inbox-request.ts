import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { getOpenBotConnections } from '../openbot/connections';
import { sourceKey } from '../openbot/messages';
import {
  nativeAssistantApi,
  NATIVE_ASSISTANT_HANDLER_ID,
} from '../openbot/native-assistants';
import { queueOpenBotMentions } from '../openbot/queue-comment';

export const openBotInboxRequest = async (
  { requestId }: { requestId: string },
  context: LogicFunctionExecutionContext,
) => {
  const { externalAssistantRequest: request } = await nativeAssistantApi<{
    externalAssistantRequest: {
      id: string;
      assistantId: string;
      threadId: string;
      messageId: string;
      workspaceMemberId: string;
      text: string;
    };
  }>(
    'query($requestId:UUID!){externalAssistantRequest(requestId:$requestId){id assistantId threadId messageId workspaceMemberId text}}',
    { requestId },
  );
  if (request.workspaceMemberId !== context.workspaceMemberId)
    throw new Error('Assistant request belongs to another member');
  const bot = getOpenBotConnections().find(
    (bot) => bot.id === request.assistantId,
  );
  if (!bot) throw new Error('Assistant unavailable');
  const source = {
    id: request.messageId,
    body: request.text,
    authorId: request.workspaceMemberId,
    authorName: 'Inbox',
    authorKind: 'HUMAN' as const,
    parentId: null,
    targetObject: 'agentChatThread',
    targetRecordId: request.threadId,
    mentions: JSON.stringify([
      { id: bot.id, label: bot.name, objectName: 'externalAssistant' },
    ]),
    resolved: false,
    deleted: false,
    createdAt: new Date().toISOString(),
    inboxRequestId: request.id,
  };
  if (!(await kv.get(sourceKey(source.id))))
    await kv.set(sourceKey(source.id), source);
  return {
    queued: await queueOpenBotMentions(
      source,
      [{ id: bot.id, objectName: 'externalAssistant' }],
      'Inbox Conversation',
    ),
  };
};
export default defineLogicFunction({
  universalIdentifier: NATIVE_ASSISTANT_HANDLER_ID,
  name: 'openbot-inbox-request',
  description:
    'Deliver a native Inbox assistant request after verifying its application-owned grant.',
  timeoutSeconds: 30,
  handler: openBotInboxRequest,
});
