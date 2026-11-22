import { isObject } from '@sniptt/guards';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { requireBotAdmin } from '../openbot/require-bot-admin';
import { scanBotAssignedTasks } from '../openbot/task-events';

export const sendOverdueReminders = async (
  input: unknown,
  context: LogicFunctionExecutionContext,
) => {
  if (
    !isObject<Record<string, unknown>, unknown>(input) ||
    input.enabled !== true
  )
    return { queued: 0, scanned: 0, enabled: false };
  if (context.workspaceMemberId) await requireBotAdmin(context);
  const interval = input.intervalMinutes;
  if (
    typeof interval !== 'number' ||
    !Number.isSafeInteger(interval) ||
    interval < 1 ||
    interval > 525600
  )
    throw new Error('Use an overdue interval from 1 to 525,600 minutes');
  return { ...(await scanBotAssignedTasks(interval)), enabled: true };
};

export default defineLogicFunction({
  universalIdentifier: 'f23bab6a-894f-4683-8722-0cecc0eb0240',
  name: 'openbot-overdue-reminders',
  description:
    'Pings currently assigned bots at most once per overdue interval. Use instead of each bot’s overdue policy.',
  handler: sendOverdueReminders,
  timeoutSeconds: 90,
  workflowActionTriggerSettings: {
    label: 'Send Overdue Task Reminders to Bots',
    icon: 'IconTool',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable Sending' },
        intervalMinutes: {
          type: 'number',
          description: 'Overdue Interval Minutes',
        },
      },
      required: ['enabled', 'intervalMinutes'],
      additionalProperties: false,
    }),
    outputSchema: [
      {
        type: 'object',
        properties: {
          queued: { type: 'number' },
          scanned: { type: 'number' },
          enabled: { type: 'boolean' },
        },
      },
    ],
  },
});
