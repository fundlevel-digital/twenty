import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { pollSearch, pollInputSchema } from './lib/search';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.poll,
  name: 'resume-search',
  description: 'Resume Nano Search',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    pollSearch(pollInputSchema.parse(unwrapInput(payload))),
  workflowActionTriggerSettings: {
    label: 'Resume Nano Search',
    icon: 'IconSearch',
    inputSchema: [
      {
        type: 'object',
        properties: {
          searchId: {
            type: 'record',
            objectUniversalIdentifier: IDENTIFIERS.search,
            label: 'Search',
          },
        },
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
      properties: { searchId: { type: 'string' } },
    },
  },
  httpRouteTriggerSettings: {
    path: '/nano-influencer/resume-search',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
