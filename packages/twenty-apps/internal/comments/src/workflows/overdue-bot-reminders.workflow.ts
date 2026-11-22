import { defineWorkflow } from 'twenty-sdk/define';

export default defineWorkflow({
  universalIdentifier: '337e544b-73b4-40f7-b2c5-9a2ad4d46394',
  name: 'Overdue Bot Reminders (Enable Sending to Start)',
  version: {
    trigger: {
      universalIdentifier: '1f878e91-dc52-41d5-a087-99e4fe138586',
      name: 'Check Every Minute',
      type: 'CRON',
      settings: { type: 'MINUTES', schedule: { minute: 1 } },
      nextStepIds: ['557872ac-f4f1-4d5f-956a-431f0397511f'],
    },
    steps: [
      {
        universalIdentifier: '557872ac-f4f1-4d5f-956a-431f0397511f',
        name: 'Send Overdue Task Reminders',
        type: 'LOGIC_FUNCTION',
        logicFunctionUniversalIdentifier:
          'f23bab6a-894f-4683-8722-0cecc0eb0240',
        input: { enabled: false, intervalMinutes: 60 },
        nextStepIds: [],
      },
    ],
  },
});
