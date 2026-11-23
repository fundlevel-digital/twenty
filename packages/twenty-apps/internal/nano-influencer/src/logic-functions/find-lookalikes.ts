import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { startSearch, searchInputSchema } from './lib/search';
import { unwrapInput } from './lib/unwrap-input';
import { SEARCH_INPUT_PROPERTIES } from '../utils/search-fields';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.findLookalikes,
  name: 'find-lookalikes',
  description:
    'Find creators similar to a Lookalike Seed with Nano keywords, metric ranges, personas, countries and deduplication filters.',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    startSearch(searchInputSchema.parse(unwrapInput(payload))),
  workflowActionTriggerSettings: {
    label: 'Find Nano Lookalikes',
    icon: 'IconSearch',
    inputSchema: [
      {
        type: 'object',
        properties: SEARCH_INPUT_PROPERTIES,
      },
    ],
    outputSchema: [
      {
        type: 'object',
        properties: {
          searchId: { type: 'string' },
          status: { type: 'string' },
          creatorIds: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
  },
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(SEARCH_INPUT_PROPERTIES).map(([key, field]) => [
          key,
          field.type === 'record' ? { ...field, type: 'string' } : field,
        ]),
      ),
      required: ['creatorId'],
    },
  },
  httpRouteTriggerSettings: {
    path: '/nano-influencer/find-lookalikes',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
