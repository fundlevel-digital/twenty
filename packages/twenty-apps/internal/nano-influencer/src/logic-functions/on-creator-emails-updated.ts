import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { maintainEmailAvailability } from './lib/email-availability';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.emailAvailabilityUpdated,
  name: 'on-creator-emails-updated',
  description:
    'Keep creator email availability aligned with stored email addresses.',
  timeoutSeconds: 180,
  databaseEventTriggerSettings: {
    eventName: 'nanoCreator.updated',
    // Tracking the derived field repairs stale writes after concurrent email edits.
    updatedFields: ['emails', 'emailAvailability'],
    batchMode: true,
  },
  handler: (payload: Parameters<typeof maintainEmailAvailability>[0]) =>
    maintainEmailAvailability(payload),
});
