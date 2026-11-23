import { defineLogicFunction } from 'twenty-sdk/define';
import { SEARCH_INPUT_PROPERTIES } from '../utils/search-fields';
import { IDENTIFIERS } from '../constants/identifiers';
import { startSync, syncInputSchema } from './lib/sync';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.sync,
  name: 'sync',
  description: 'Sync Nano Lists',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    startSync(syncInputSchema.parse(unwrapInput(payload))),
  workflowActionTriggerSettings: {
    label: 'Sync Nano Lists',
    icon: 'IconSearch',
    inputSchema: [
      {
        type: 'object',
        properties: {
          connectionId: SEARCH_INPUT_PROPERTIES.connectionId,
          listIds: {
            type: 'records',
            objectUniversalIdentifier: IDENTIFIERS.list,
            label: 'Lists',
          },
        },
      },
    ],
    outputSchema: [
      { type: 'object', properties: { queued: { type: 'number' } } },
    ],
  },
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        connectionId: { type: 'string' },
        listIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  httpRouteTriggerSettings: {
    path: '/nano-influencer/sync',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
