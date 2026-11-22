import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { enqueue } from './lib/jobs';
import {
  groupedViewsInputSchema,
  refreshGroupedViews,
} from './lib/grouped-views';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.refreshGroups,
  name: 'refresh-groups',
  description:
    'Backfill Nano decision makers and populate native relation groups.',
  timeoutSeconds: 180,
  handler: async (payload: unknown) => {
    const raw = unwrapInput(payload);
    const input = groupedViewsInputSchema.parse(raw);
    if (
      typeof raw === 'object' &&
      raw !== null &&
      !('after' in raw) &&
      !input.records
    ) {
      await enqueue(IDENTIFIERS.refreshGroups, input);
      return { queued: 1 };
    }
    return refreshGroupedViews(input);
  },
  httpRouteTriggerSettings: {
    path: '/nano-influencer/refresh-groups',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
