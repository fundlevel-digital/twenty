import { defineWorkflow } from 'twenty-sdk/define';

export default defineWorkflow({
  universalIdentifier: '0e87e1fa-bc23-52c6-89b3-61cb1481ac50',
  name: 'Overdue Bot Reminders (Enable Sending to Start)',
  version: {
    trigger: {
      universalIdentifier: 'c654bc16-0d1c-53b4-a06f-62106dfce5bf',
      name: 'Check Every Minute',
      type: 'CRON',
      settings: { type: 'MINUTES', schedule: { minute: 1 } },
      nextStepIds: ['c5d25ec8-8d7f-5284-bdd4-4542973ba258'],
    },
    steps: [
      {
        universalIdentifier: 'c5d25ec8-8d7f-5284-bdd4-4542973ba258',
        name: 'Send Overdue Task Reminders',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier:
          '5dd7c333-db4a-5712-b079-0f73c98ed483',
        input: { enabled: false, intervalMinutes: 60 },
        nextStepIds: [],
      },
    ],
  },
});
