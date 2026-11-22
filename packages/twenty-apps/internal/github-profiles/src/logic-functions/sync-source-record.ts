import { getSyncSettings } from 'src/logic-functions/utils/sync-settings';
import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { z } from 'zod';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { sourceTypeSchema } from 'src/types/sync-settings';
import { queueSyncJob } from 'src/logic-functions/utils/backfill';

const INPUT = {
  type: 'object' as const,
  properties: {
    sourceType: { type: 'string' as const, enum: ['person', 'company'] },
    recordId: { type: 'string' as const },
    automatic: { type: 'boolean' as const },
  },
  required: ['sourceType', 'recordId'],
};
export const queueSourceSync = async (parameters: unknown) => {
  const input = z
    .object({
      sourceType: sourceTypeSchema,
      recordId: z.string().uuid(),
      automatic: z.boolean().default(false),
    })
    .parse(parameters);
  if (input.automatic && !(await getSyncSettings())[input.sourceType].enabled)
    return { queued: false, reason: 'Automatic sync is disabled.' };
  await queueSyncJob(input);
  return { queued: true };
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SYNC_SOURCE,
  name: 'sync-github-profiles-from-record',
  description:
    'Queues profile creation or relation updates using the configured source field.',
  timeoutSeconds: 20,
  handler: queueSourceSync,
  workflowActionTriggerSettings: {
    label: 'Sync GitHub Profiles from Record',
    inputSchema: jsonSchemaToInputSchema(INPUT),
    outputSchema: [
      {
        type: 'object',
        properties: { queued: { type: 'boolean' }, reason: { type: 'string' } },
      },
    ],
  },
});
