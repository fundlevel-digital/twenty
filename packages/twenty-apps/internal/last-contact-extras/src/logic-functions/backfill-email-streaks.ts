import { defineLogicFunction } from 'twenty-sdk/define';
import { enqueueJobs } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';

import { BACKFILL_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type Connection,
  recomputePersonStreaks,
} from 'src/utils/recompute-person-streaks';
import {
  createWorkspaceGraphqlClient,
  type WorkspaceGraphqlClient,
} from 'src/utils/workspace-graphql-client';

type BackfillPayload = { afterPersonId?: string | null; personIds?: string[] };

export const backfillEmailStreaks = async (
  payload: BackfillPayload,
  client: WorkspaceGraphqlClient = createWorkspaceGraphqlClient(),
) => {
  if (isDefined(payload.personIds)) {
    if (payload.personIds.length > 50) {
      throw new Error('Refresh at most 50 people per request');
    }

    return { updated: await recomputePersonStreaks(client, payload.personIds) };
  }

  const { messageParticipants } = await client.request<{
    messageParticipants: Connection<{ personId: string }>;
  }>(
    `
    query StreakPeople($filter: MessageParticipantFilterInput!) {
      messageParticipants(first: 200, filter: $filter, orderBy: [{personId: AscNullsLast}]) {
        edges { node { personId } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `,
    {
      filter: isDefined(payload.afterPersonId)
        ? { personId: { gt: payload.afterPersonId } }
        : { personId: { is: 'NOT_NULL' } },
    },
  );

  const personIds = [
    ...new Set(messageParticipants.edges.map(({ node }) => node.personId)),
  ].slice(0, 50);
  const updated = await recomputePersonStreaks(client, personIds);
  const afterPersonId = personIds[personIds.length - 1];

  // Skip the rest of each person's participant rows after recomputing their complete history.
  if (isDefined(afterPersonId)) {
    await enqueueJobs({
      logicFunctionUniversalIdentifier: BACKFILL_FUNCTION_UNIVERSAL_IDENTIFIER,
      jobs: [{ payload: { afterPersonId } }],
      delayMs: 2_000,
    });
  }

  console.log('Email streak backfill batch completed', {
    processed: personIds.length,
    updated,
    hasNextPage: isDefined(afterPersonId),
  });

  return {
    processed: personIds.length,
    updated,
    hasNextPage: isDefined(afterPersonId),
  };
};

export default defineLogicFunction({
  universalIdentifier: BACKFILL_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'backfill-email-streaks',
  description:
    'Refreshes all people in resumable batches, or up to 50 selected person IDs. Reconciles daily.',
  timeoutSeconds: 900,
  handler: (payload: BackfillPayload) => backfillEmailStreaks(payload),
  cronTriggerSettings: { pattern: '0 6 * * *' },
});
