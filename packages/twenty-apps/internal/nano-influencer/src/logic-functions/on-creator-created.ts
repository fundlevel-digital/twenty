import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { maintainEmailAvailability } from './lib/email-availability';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.emailAvailabilityCreated,
  name: 'on-creator-created',
  description: 'Classify a new creator by its stored email addresses.',
  timeoutSeconds: 180,
  databaseEventTriggerSettings: {
    eventName: 'nanoCreator.created',
    batchMode: true,
  },
  handler: (payload: Parameters<typeof maintainEmailAvailability>[0]) =>
    maintainEmailAvailability(payload),
});
