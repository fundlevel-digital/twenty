import {
  loadPreferences,
  updateSyncStatus,
} from 'src/logic-functions/utils/connection-preferences';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  jsonSchemaToInputSchema,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { enqueue } from 'src/logic-functions/utils/enqueue';
import { requestConnection } from 'src/logic-functions/utils/request-connection';
export const sync = async (
  _parameters: unknown,
  context: LogicFunctionExecutionContext,
) => {
  try {
    const connection = await requestConnection(context);
    const preferences = await loadPreferences(connection.id);
    if (preferences.settings.paused)
      return {
        queued: false,
        error: 'Resume this account in Cal.com Settings before syncing.',
      };
    await enqueue(IDENTIFIERS.SYNC_WORKER, {
      connectedAccountId: connection.id,
      revision: preferences.revision,
    });
    await updateSyncStatus(connection.id, {
      phase: 'QUEUED',
      error: undefined,
    });
    return { queued: true };
  } catch (error) {
    return {
      queued: false,
      error: error instanceof Error ? error.message : 'Cal.com Sync Failed',
    };
  }
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SYNC,
  name: 'sync-cal-com-bookings',
  description: 'Sync bookings from the current user’s Cal.com connection.',
  timeoutSeconds: 30,
  handler: sync,
  httpRouteTriggerSettings: {
    path: '/cal-com/sync',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  workflowActionTriggerSettings: {
    label: 'Sync Cal.com Bookings',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    outputSchema: [
      {
        type: 'object',
        properties: { queued: { type: 'boolean' }, error: { type: 'string' } },
      },
    ],
  },
});
