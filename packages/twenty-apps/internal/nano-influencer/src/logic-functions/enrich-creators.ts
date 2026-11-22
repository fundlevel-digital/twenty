import { defineLogicFunction } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { enrichCreators, enrichInputSchema } from './lib/enrich';
import { unwrapInput } from './lib/unwrap-input';

export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.enrich,
  name: 'enrich-creators',
  description:
    'Refresh creator profiles, audience size, bios and related links from NanoInfluencer without changing list membership or matching paid contacts.',
  timeoutSeconds: 360,
  handler: (payload: unknown) =>
    enrichCreators(enrichInputSchema.parse(unwrapInput(payload))),
  httpRouteTriggerSettings: {
    path: '/nano-influencer/enrich-creators',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
  workflowActionTriggerSettings: {
    label: 'Enrich With NanoInfluencer',
    icon: 'IconSparkles',
    inputSchema: [
      {
        type: 'object',
        properties: {
          creatorIds: {
            type: 'records',
            objectUniversalIdentifier: IDENTIFIERS.creator,
            label: 'Creators',
          },
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
      required: ['creatorIds'],
      properties: { creatorIds: { type: 'array', items: { type: 'string' } } },
    },
  },
});
