import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { startSearch, searchInputSchema } from './lib/search';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.findLookalikes,
  name: 'find-lookalikes',
  description: 'Find Nano Lookalikes',
  timeoutSeconds: 180,
  handler: (payload: unknown) =>
    startSearch(searchInputSchema.parse(unwrapInput(payload))),
  workflowActionTriggerSettings: {
    label: 'Find Nano Lookalikes',
    icon: 'IconSearch',
    inputSchema: [
      {
        type: 'object',
        properties: {
          connectionId: { type: 'string', label: 'API Connection ID' },
          creatorId: {
            type: 'record',
            objectUniversalIdentifier: IDENTIFIERS.creator,
            label: 'Creator',
          },
          listId: {
            type: 'record',
            objectUniversalIdentifier: IDENTIFIERS.list,
            label: 'List',
          },
          requestId: { type: 'string' },
          filters: {
            type: 'object',
            properties: {
              subs: { type: 'array', items: { type: 'number' } },
              views: { type: 'array', items: { type: 'number' } },
              posts: { type: 'array', items: { type: 'number' } },
              lastPostDays: { type: 'number' },
              email: { type: 'boolean' },
              country: { type: 'array', items: { type: 'string' } },
            },
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
      properties: {
        connectionId: { type: 'string' },
        creatorId: { type: 'string' },
        listId: { type: 'string' },
        requestId: { type: 'string' },
        filters: {
          type: 'object',
          properties: {
            subs: { type: 'array', items: { type: 'number' } },
            views: { type: 'array', items: { type: 'number' } },
            posts: { type: 'array', items: { type: 'number' } },
            lastPostDays: { type: 'number' },
            email: { type: 'boolean' },
            country: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
  httpRouteTriggerSettings: {
    path: '/nano-influencer/find-lookalikes',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
