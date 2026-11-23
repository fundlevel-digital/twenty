import { defineLogicFunction } from 'twenty-sdk/define';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';
import { requireBotAdmin } from '../openbot/require-bot-admin';
import { scanBotAssignedTasks } from '../openbot/task-events';

export const openBotTaskTick = async (
  _: unknown,
  context: LogicFunctionExecutionContext,
) => {
  if (context.workspaceMemberId) await requireBotAdmin(context);
  return scanBotAssignedTasks();
};

export default defineLogicFunction({
  universalIdentifier: '1e663dd2-2451-58d6-a9ae-b0b28a88f751',
  name: 'openbot-task-tick',
  description:
    'Checks assigned tasks for opted-in bot notifications once per minute.',
  handler: openBotTaskTick,
  timeoutSeconds: 90,
  cronTriggerSettings: { pattern: '* * * * *' },
});
