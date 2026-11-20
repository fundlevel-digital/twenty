import { type CoreApiClient } from 'twenty-client-sdk/core';

import { LAST_SENDER_STREAK_MAX } from 'src/constants/last-sender-streak';
import {
  collectMessageInteractions,
  type MessageInteraction,
} from 'src/utils/collect-message-interactions';
import {
  computeLastSenderStreak,
  type LastSenderStreakMessage,
} from 'src/utils/compute-last-sender-streak';
import { executeWithRetry } from 'src/utils/execute-with-retry';

const NEWEST_FIRST_ORDER_BY = [
  { message: { receivedAt: 'DescNullsLast' } },
  { messageId: 'DescNullsLast' },
];

type RecentParticipantNode = {
  messageId?: string | null;
  message?: { receivedAt?: string | null; isDraft?: boolean | null } | null;
};

// A person can sit on one message more than once (to and cc), so pages are
// read until enough distinct messages are known.
const collectRecentMessageIds = async (
  client: CoreApiClient,
  personId: string,
): Promise<string[]> => {
  const messageIds = new Set<string>();
  let after: string | undefined;

  do {
    const { messageParticipants } = await executeWithRetry(() =>
      client.query({
        messageParticipants: {
          __args: {
            filter: { personId: { eq: personId } },
            orderBy: NEWEST_FIRST_ORDER_BY,
            first: LAST_SENDER_STREAK_MAX,
            after,
          },
          edges: {
            node: {
              messageId: true,
              message: { receivedAt: true, isDraft: true },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      }),
    );

    for (const edge of messageParticipants?.edges ?? []) {
      const { messageId, message } = edge.node as RecentParticipantNode;

      if (messageId && message?.receivedAt && !message.isDraft) {
        messageIds.add(messageId);
      }
    }

    after =
      messageIds.size < LAST_SENDER_STREAK_MAX &&
      messageParticipants?.pageInfo.hasNextPage
        ? (messageParticipants.pageInfo.endCursor ?? undefined)
        : undefined;
  } while (after);

  return [...messageIds];
};

export const collectLastSenderStreaks = async (
  client: CoreApiClient,
  personIds: string[],
  knownInteractionByMessageId: Map<string, MessageInteraction>,
): Promise<Map<string, number | null>> => {
  const recentMessageIdsByPersonId = new Map<string, string[]>();

  for (const personId of personIds) {
    recentMessageIdsByPersonId.set(
      personId,
      await collectRecentMessageIds(client, personId),
    );
  }

  const interactionByMessageId = new Map(knownInteractionByMessageId);
  const unknownMessageIds = [
    ...new Set([...recentMessageIdsByPersonId.values()].flat()),
  ].filter((messageId) => !interactionByMessageId.has(messageId));

  if (unknownMessageIds.length > 0) {
    const interactions = await collectMessageInteractions(
      client,
      unknownMessageIds,
    );

    for (const [messageId, interaction] of interactions) {
      interactionByMessageId.set(messageId, interaction);
    }
  }

  const lastSenderStreakByPersonId = new Map<string, number | null>();

  for (const [personId, messageIds] of recentMessageIdsByPersonId) {
    const messages = messageIds.flatMap<LastSenderStreakMessage>(
      (messageId) => {
        const interaction = interactionByMessageId.get(messageId);

        return interaction
          ? [
              {
                messageId,
                receivedAt: interaction.receivedAt,
                direction: interaction.direction,
              },
            ]
          : [];
      },
    );

    lastSenderStreakByPersonId.set(personId, computeLastSenderStreak(messages));
  }

  return lastSenderStreakByPersonId;
};
