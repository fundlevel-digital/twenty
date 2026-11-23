import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { setFlags, flagInputSchema } from './lib/flags';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.flags,
  name: 'set-flags',
  description: 'Set Nano Creator State',
  timeoutSeconds: 360,
  handler: (payload: unknown) =>
    setFlags(flagInputSchema.parse(unwrapInput(payload))),
  workflowActionTriggerSettings: {
    label: 'Set Nano Creator State',
    icon: 'IconSearch',
    inputSchema: [
      {
        type: 'object',
        properties: {
          listId: {
            type: 'record',
            objectUniversalIdentifier: IDENTIFIERS.list,
            label: 'List',
          },
          creatorIds: {
            type: 'records',
            objectUniversalIdentifier: IDENTIFIERS.creator,
            label: 'Creators',
          },
          flag: { type: 'string', enum: ['fav', 'hide', 'del'] },
        },
      },
    ],
    outputSchema: [
      {
        type: 'object',
        properties: {
          updated: { type: 'array', items: { type: 'string' } },
          failed: { type: 'array', items: { type: 'object' } },
        },
      },
    ],
  },
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string' },
        creatorIds: { type: 'array', items: { type: 'string' } },
        flag: { type: 'string', enum: ['fav', 'hide', 'del'] },
      },
    },
  },
  httpRouteTriggerSettings: {
    path: '/nano-influencer/set-flags',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
