import { loadPreferences } from 'src/logic-functions/utils/connection-preferences';
import { defineLogicFunction } from 'twenty-sdk/define';
import { listCalComConnections } from 'src/logic-functions/utils/list-cal-com-connections';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { enqueue } from 'src/logic-functions/utils/enqueue';
export const reconcile = async () => {
  const connections = await listCalComConnections();
  let queued = 0;
  for (const connection of connections) {
    if (
      !connection.authFailedAt &&
      !(await loadPreferences(connection.id)).settings.paused
    ) {
      queued++;
      await enqueue(IDENTIFIERS.SYNC_WORKER, {
        connectedAccountId: connection.id,
      });
    }
  }
  return { queued };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.RECONCILE,
  name: 'cal-com-reconcile',
  description:
    'Recovers missed booking changes and links calendars that synced later.',
  timeoutSeconds: 60,
  handler: reconcile,
  cronTriggerSettings: { pattern: '0 */6 * * *' },
});
