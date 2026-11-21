import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs, listConnections } from 'twenty-sdk/logic-function';
import { LOGIC_FUNCTION, REBUILD } from 'src/constants/universal-identifiers';
import { LINKEDIN_PROVIDER_NAME } from 'src/constants/linkedin-provider-name.constant';
import { refreshLinkedinHistoryImportState } from 'src/logic-functions/utils/refresh-linkedin-history-import-state.util';

export const linkedinCatchUpHandler = async () => {
  const connections = await listConnections({
    providerName: LINKEDIN_PROVIDER_NAME,
  });
  for (const connection of connections) {
    if (connection.authFailedAt !== null) continue;
    await refreshLinkedinHistoryImportState(connection.id);
    const bucket = Math.floor(Date.now() / 300000);
    for (const [kind, identifier] of [
      ['messages', REBUILD.CATCH_UP_ACCOUNT],
      ['connections', REBUILD.CONNECTION_SYNC],
    ] as const) {
      await enqueueJobs({
        logicFunctionUniversalIdentifier: identifier,
        jobs: [
          {
            jobId: `linkedin-${kind}-${connection.id}-${bucket}`,
            payload: { connectedAccountId: connection.id },
          },
        ],
        retryLimit: 3,
      });
    }
  }
  return { connections: connections.length };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION.SYNC_TICK,
  name: 'linkedin-sync-tick',
  description:
    'Checks history jobs, catches missed messages and refreshes LinkedIn connections for every member.',
  timeoutSeconds: 60,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
  handler: linkedinCatchUpHandler,
});
