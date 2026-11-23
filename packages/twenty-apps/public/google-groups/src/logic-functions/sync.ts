import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { syncMailbox } from 'src/logic-functions/utils/sync-mailbox';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SYNC,
  name: 'google-groups-sync',
  timeoutSeconds: 120,
  handler: syncMailbox,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
});
