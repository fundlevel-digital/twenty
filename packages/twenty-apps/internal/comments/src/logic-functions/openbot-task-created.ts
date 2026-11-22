import { defineLogicFunction } from 'twenty-sdk/define';
import { openBotTaskUpdated } from './openbot-task-updated';

export default defineLogicFunction({
  universalIdentifier: '24c183e4-b2be-49ab-a2c4-24f649082674',
  name: 'openbot-task-created',
  description: 'Queues opted-in notifications for bots on newly created tasks.',
  handler: openBotTaskUpdated,
  timeoutSeconds: 90,
  databaseEventTriggerSettings: { eventName: 'task.created' },
});
