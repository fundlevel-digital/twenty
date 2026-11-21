import { isDefined } from 'twenty-sdk/utils';

import {
  type Connection,
  recomputePersonStreaks,
} from 'src/utils/recompute-person-streaks';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

export type EmailEvent = {
  recordId: string;
  properties: {
    before?: { personId?: string | null; messageId?: string | null };
    after?: { personId?: string | null; messageId?: string | null };
  };
};

export const recomputeMessageStreaks = async (
  client: WorkspaceGraphqlClient,
  messageIds: string[],
  previousPersonIds: string[] = [],
): Promise<number> => {
  const personIds = new Set(previousPersonIds);
  const uniqueMessageIds = [...new Set(messageIds)];

  for (let offset = 0; offset < uniqueMessageIds.length; offset += 100) {
    let after: string | null = null;

    do {
      const {
        messageParticipants,
      }: {
        messageParticipants: Connection<{ personId: string | null }>;
      } = await client.request(
        `
        query EmailPeople($messageIds: [UUID!]!, $after: String) {
          messageParticipants(filter: {messageId: {in: $messageIds}}, first: 200, after: $after) {
            edges { node { personId } }
            pageInfo { hasNextPage endCursor }
          }
        }
      `,
        { messageIds: uniqueMessageIds.slice(offset, offset + 100), after },
      );

      for (const { node } of messageParticipants.edges) {
        if (isDefined(node.personId)) {
          personIds.add(node.personId);
        }
      }

      after = messageParticipants.pageInfo.hasNextPage
        ? messageParticipants.pageInfo.endCursor
        : null;
    } while (isDefined(after));
  }

  return recomputePersonStreaks(client, [...personIds]);
};
