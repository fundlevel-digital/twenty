import { isDefined } from 'twenty-sdk/utils';

import {
  computeLastSenderStreak,
  LAST_SENDER_STREAK_MAX,
  type StreakMessage,
} from 'src/utils/compute-last-sender-streak';
import { type WorkspaceGraphqlClient } from 'src/utils/workspace-graphql-client';

export type Connection<TNode> = {
  edges: { node: TNode }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type Participant = {
  messageId: string | null;
  message: {
    receivedAt: string | null;
    isDraft: boolean;
    messageParticipants: Connection<{ workspaceMemberId: string | null }>;
  } | null;
};

const RECENT_EMAILS_QUERY = `
  query RecentEmails($personId: UUID!, $after: String) {
    person(filter: {id: {eq: $personId}}) { id lastSenderStreak }
    messageParticipants(
      filter: {personId: {eq: $personId}},
      orderBy: [{message: {receivedAt: DescNullsLast}}, {messageId: DescNullsLast}],
      first: 50, after: $after
    ) {
      edges { node {
        messageId
        message {
          receivedAt isDraft
          messageParticipants(first: 10, filter: {role: {eq: FROM}}) {
            edges { node { workspaceMemberId } }
          }
        }
      } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const recomputePersonStreaks = async (
  client: WorkspaceGraphqlClient,
  personIds: string[],
): Promise<number> => {
  let updated = 0;

  for (const personId of new Set(personIds)) {
    const messages = new Map<string, StreakMessage>();
    let after: string | null = null;
    let currentStreak: number | null = null;
    let personExists = false;

    do {
      const result: {
        person: { id: string; lastSenderStreak: number | null } | null;
        messageParticipants: Connection<Participant>;
      } = await client.request(RECENT_EMAILS_QUERY, { personId, after });

      personExists = isDefined(result.person);
      currentStreak = result.person?.lastSenderStreak ?? null;

      if (!personExists) {
        break;
      }

      for (const { node } of result.messageParticipants.edges) {
        if (
          !isDefined(node.messageId) ||
          !isDefined(node.message?.receivedAt) ||
          node.message.isDraft
        ) {
          continue;
        }

        messages.set(node.messageId, {
          id: node.messageId,
          receivedAt: node.message.receivedAt,
          direction: node.message.messageParticipants.edges.some(
            ({ node: sender }) => isDefined(sender.workspaceMemberId),
          )
            ? 'outbound'
            : 'inbound',
        });
      }

      const pageInfo = result.messageParticipants.pageInfo;
      after =
        messages.size < LAST_SENDER_STREAK_MAX && pageInfo.hasNextPage
          ? pageInfo.endCursor
          : null;
    } while (isDefined(after));

    const lastSenderStreak = computeLastSenderStreak([...messages.values()]);

    if (!personExists || currentStreak === lastSenderStreak) {
      continue;
    }

    await client.request(
      `
      mutation UpdatePersonStreak($personId: UUID!, $data: PersonUpdateInput!) {
        updatePerson(id: $personId, data: $data) { id }
      }
    `,
      { personId, data: { lastSenderStreak } },
    );
    updated += 1;
  }

  return updated;
};
