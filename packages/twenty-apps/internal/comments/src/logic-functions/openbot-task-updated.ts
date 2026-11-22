import { isObject, isString } from '@sniptt/guards';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  botAssigneeIds,
  loadBotAssignedTask,
  processBotAssignedTask,
} from '../openbot/task-events';

export const openBotTaskUpdated = async (event: unknown) => {
  if (
    !isObject<Record<string, unknown>, unknown>(event) ||
    !isString(event.recordId)
  )
    return { queued: 0 };
  const task = await loadBotAssignedTask(event.recordId);
  const properties = isObject<Record<string, unknown>, unknown>(
    event.properties,
  )
    ? event.properties
    : null;
  const before =
    properties && isObject<Record<string, unknown>, unknown>(properties.before)
      ? properties.before
      : null;
  const previousIds = before ? botAssigneeIds(before.openBotAssignees) : [];
  const assignmentChanged =
    !before ||
    (Array.isArray(properties?.updatedFields) &&
      properties.updatedFields.includes('openBotAssignees'));
  const added =
    task && properties && assignmentChanged
      ? botAssigneeIds(task.openBotAssignees).filter(
          (id) => !previousIds.includes(id),
        )
      : [];
  return {
    queued: task
      ? await processBotAssignedTask(task, Date.now(), undefined, added)
      : 0,
  };
};

export default defineLogicFunction({
  universalIdentifier: '804356cb-3389-42e1-a74f-60a9fe6481ef',
  name: 'openbot-task-updated',
  description:
    'Updates bot assignments and queues opted-in task notifications.',
  handler: openBotTaskUpdated,
  timeoutSeconds: 90,
  databaseEventTriggerSettings: {
    eventName: 'task.updated',
    updatedFields: ['openBotAssignees', 'dueAt', 'status'],
  },
});
