import { defineLogicFunction } from 'twenty-sdk/define';
import { z } from 'zod';
import { IDENTIFIERS } from '../constants/identifiers';
import { startHistorySync } from './lib/history';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.syncHistory,
  name: 'sync-history',
  description:
    'Import existing Nano searches and saved results without submitting a new search.',
  timeoutSeconds: 120,
  handler: (payload: unknown) =>
    startHistorySync(
      z
        .object({ connectionId: z.string().optional() })
        .parse(unwrapInput(payload)).connectionId,
    ),
  httpRouteTriggerSettings: {
    path: '/nano-influencer/sync-history',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  workflowActionTriggerSettings: {
    label: 'Sync Nano Search History',
    icon: 'IconHistory',
    inputSchema: [
      {
        type: 'object',
        properties: {
          connectionId: { type: 'string', label: 'API Connection ID' },
        },
      },
    ],
    outputSchema: [
      {
        type: 'object',
        properties: {
          queued: { type: 'number' },
          totalCount: { type: 'number' },
        },
      },
    ],
  },
});
