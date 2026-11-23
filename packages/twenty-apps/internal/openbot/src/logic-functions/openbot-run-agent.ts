import { defineLogicFunction } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { getOpenBotConnections } from '../openbot/connections';
import { nativeAssistantApi } from '../openbot/native-assistants';

type NativeAgentRunResult = {
  threadId: string;
  runId: string;
  status: string;
  success: boolean;
  result: object | null;
  error: string | null;
};

export const runOpenBotAgent = async (
  { agentId, prompt }: { agentId: string; prompt: string },
  context: LogicFunctionExecutionContext,
): Promise<NativeAgentRunResult> => {
  if (!context.workspaceMemberId)
    throw new Error('A workspace member is required to run this agent');
  if (!getOpenBotConnections().some((bot) => bot.id === agentId))
    throw new Error('Agent unavailable');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 9500)
    throw new Error('Write a request of up to 9,500 characters');
  const { runAgent } = await nativeAssistantApi<{
    runAgent: NativeAgentRunResult;
  }>(
    'mutation($input:RunAgentInput!){runAgent(input:$input){threadId runId status success result error}}',
    {
      input: {
        agentUniversalIdentifier: agentId,
        input: [{ role: 'user', content: prompt }],
        runAsWorkspaceMemberId: context.workspaceMemberId,
        waitForCompletion: false,
      },
    },
  );
  return runAgent;
};

export default defineLogicFunction({
  universalIdentifier: '63696bdc-7595-4f9e-bfe3-93cc9f9951e1',
  name: 'openbot-run-agent',
  description:
    'Run an enrolled native Twenty Agent using its OpenBot application runtime.',
  timeoutSeconds: 90,
  handler: runOpenBotAgent,
  workflowActionTriggerSettings: {
    label: 'Run OpenBot Agent',
    icon: 'IconSparkles',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        prompt: { type: 'string', description: 'Prompt' },
      },
      required: ['agentId', 'prompt'],
      additionalProperties: false,
    }),
    outputSchema: [
      {
        type: 'object',
        properties: {
          threadId: { type: 'string' },
          runId: { type: 'string' },
          status: { type: 'string' },
          success: { type: 'boolean' },
          result: { type: 'object', properties: { text: { type: 'string' } } },
          error: { type: 'string' },
        },
      },
    ],
  },
});
