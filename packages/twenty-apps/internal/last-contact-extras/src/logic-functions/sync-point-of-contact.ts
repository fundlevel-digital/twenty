import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';

import { SYNC_CONTACT_PERSON_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { type Connection } from 'src/utils/recompute-person-streaks';
import { syncContactPeople } from 'src/utils/sync-contact-people';
import { createWorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

type ContactLinkEvent = {
  properties: {
    before?: { influencerId?: string | null };
    after?: { influencerId?: string | null };
  };
};

type SyncContactPayload = {
  events?: ContactLinkEvent[];
  influencerIds?: string[];
  after?: string | null;
};

export const syncPointOfContact = async (payload: SyncContactPayload) => {
  const client = createWorkspaceGraphqlClient();

  if (isDefined(payload.events)) {
    const influencerIds = payload.events.flatMap(({ properties }) =>
      [properties.before?.influencerId, properties.after?.influencerId].filter(
        isDefined,
      ),
    );

    return { updated: await syncContactPeople(client, influencerIds) };
  }

  if (isDefined(payload.influencerIds)) {
    if (payload.influencerIds.length > 50) {
      throw new Error('Refresh at most 50 influencers per request');
    }

    return { updated: await syncContactPeople(client, payload.influencerIds) };
  }

  const { influencers } = await client.request<{
    influencers: Connection<{ id: string }>;
  }>(
    `
    query InfluencerContactBatch($after: String) {
      influencers(first: 50, after: $after, orderBy: [{id: AscNullsLast}]) {
        edges { node { id } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `,
    { after: payload.after ?? null },
  );

  const updated = await syncContactPeople(
    client,
    influencers.edges.map(({ node }) => node.id),
  );

  if (
    influencers.pageInfo.hasNextPage &&
    isDefined(influencers.pageInfo.endCursor)
  ) {
    await enqueueJobs({
      logicFunctionUniversalIdentifier:
        SYNC_CONTACT_PERSON_FUNCTION_UNIVERSAL_IDENTIFIER,
      jobs: [{ payload: { after: influencers.pageInfo.endCursor } }],
      delayMs: 2_000,
    });
  }

  return {
    updated,
    processed: influencers.edges.length,
    hasNextPage: influencers.pageInfo.hasNextPage,
  };
};

export default defineLogicFunction({
  universalIdentifier: SYNC_CONTACT_PERSON_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'sync-point-of-contact',
  description:
    'Keeps the native Person relation on each influencer aligned with its latest contacted person. Reconciles daily.',
  timeoutSeconds: 900,
  handler: syncPointOfContact,
  cronTriggerSettings: { pattern: '30 6 * * *' },
  databaseEventTriggerSettings: {
    eventName: 'influencerContact.*',
    updatedFields: ['influencerId', 'personId'],
    batchMode: true,
  },
});
