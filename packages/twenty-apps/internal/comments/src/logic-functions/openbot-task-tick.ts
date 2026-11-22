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
  universalIdentifier: 'b4b5bc19-105d-4f54-b697-317b5468fba1',
  name: 'openbot-task-tick',
  description:
    'Checks assigned tasks for opted-in bot notifications once per minute.',
  handler: openBotTaskTick,
  timeoutSeconds: 90,
  cronTriggerSettings: { pattern: '* * * * *' },
});
