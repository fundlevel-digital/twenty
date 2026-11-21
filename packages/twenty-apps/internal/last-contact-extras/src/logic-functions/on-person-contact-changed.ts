import { defineLogicFunction } from 'twenty-sdk/define';

import { PERSON_CONTACT_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getInfluencerIdsForPeople,
  syncContactPeople,
} from 'src/utils/sync-contact-people';
import { createWorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

const handler = async (batch: { events: { recordId: string }[] }) => {
  const client = createWorkspaceGraphqlClient();
  const influencerIds = await getInfluencerIdsForPeople(
    client,
    batch.events.map(({ recordId }) => recordId),
  );

  return syncContactPeople(client, influencerIds);
};

export default defineLogicFunction({
  universalIdentifier: PERSON_CONTACT_CHANGED_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-person-contact-changed',
  description:
    'Refreshes native influencer contact links when a person is contacted or removed.',
  timeoutSeconds: 900,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'person.*',
    updatedFields: ['lastContactAt'],
    batchMode: true,
  },
});
