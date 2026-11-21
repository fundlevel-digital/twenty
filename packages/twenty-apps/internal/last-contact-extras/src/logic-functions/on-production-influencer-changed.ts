import { defineLogicFunction } from 'twenty-sdk/define';

import { PRODUCTION_CONTACT_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { syncProductionContactPeople } from 'src/utils/sync-contact-people';
import { createWorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

const handler = async (batch: { events: { recordId: string }[] }) =>
  syncProductionContactPeople(
    createWorkspaceGraphqlClient(),
    batch.events.map(({ recordId }) => recordId),
  );

export default defineLogicFunction({
  universalIdentifier: PRODUCTION_CONTACT_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-production-influencer-changed',
  description:
    'Refreshes the Person relation when a production is created or its influencer changes.',
  timeoutSeconds: 900,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'production.*',
    updatedFields: ['influencerId'],
    batchMode: true,
  },
});
