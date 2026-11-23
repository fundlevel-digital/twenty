import { defineLogicFunction } from 'twenty-sdk/define';
import { openBotTaskUpdated } from './openbot-task-updated';

export default defineLogicFunction({
  universalIdentifier: 'f6819952-07d9-5dcf-9b89-1cbf07dbc026',
  name: 'openbot-task-created',
  description: 'Queues opted-in notifications for bots on newly created tasks.',
  handler: openBotTaskUpdated,
  timeoutSeconds: 90,
  databaseEventTriggerSettings: { eventName: 'task.created' },
});
