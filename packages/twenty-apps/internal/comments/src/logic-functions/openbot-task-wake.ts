import { isObject, isString } from '@sniptt/guards';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  RetryableLogicFunctionError,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { requireBotAdmin } from '../openbot/require-bot-admin';
import {
  loadBotAssignedTask,
  processBotAssignedTask,
} from '../openbot/task-events';

export const openBotTaskWake = async (
  input: unknown,
  context: LogicFunctionExecutionContext,
) => {
  if (context.workspaceMemberId) await requireBotAdmin(context);
  if (
    !isObject<Record<string, unknown>, unknown>(input) ||
    !isString(input.taskId)
  )
    throw new Error('Select a task');
  try {
    const task = await loadBotAssignedTask(input.taskId);
    return { queued: task ? await processBotAssignedTask(task) : 0 };
  } catch {
    throw new RetryableLogicFunctionError(
      'Task reminder processing failed. Retry the same task.',
    );
  }
};
export default defineLogicFunction({
  universalIdentifier: 'fa38b5fe-e378-4d4a-a777-8a834c9c2d1d',
  name: 'openbot-task-wake',
  description:
    'Rechecks the current task and notification policy at the next scheduled reminder time.',
  timeoutSeconds: 90,
  handler: openBotTaskWake,
});
