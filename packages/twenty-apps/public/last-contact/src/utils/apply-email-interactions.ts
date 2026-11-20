import { type CoreApiClient } from 'twenty-client-sdk/core';

import { applyPersonInteractions } from 'src/utils/apply-person-interactions';
import { collectLastSenderStreaks } from 'src/utils/collect-last-sender-streaks';
import { collectMessageInteractions } from 'src/utils/collect-message-interactions';
import { type Interaction } from 'src/utils/update-person-last-contact';

export type MessageParticipantLink = {
  personId: string;
  messageId: string;
};

export const applyEmailInteractions = async (
  client: CoreApiClient,
  links: MessageParticipantLink[],
): Promise<void> => {
  const messageIds = [...new Set(links.map((link) => link.messageId))];

  if (messageIds.length === 0) {
    return;
  }

  const interactionByMessageId = await collectMessageInteractions(
    client,
    messageIds,
  );
  const interactionsByPersonId = new Map<string, Interaction[]>();

  for (const { personId, messageId } of links) {
    const message = interactionByMessageId.get(messageId);

    if (!message) {
      continue;
    }

    const interaction: Interaction = {
      kind: 'email',
      occurredAt: message.receivedAt,
      itemId: messageId,
      workspaceMemberId: message.workspaceMemberId,
      direction: message.direction,
    };
    const interactions = interactionsByPersonId.get(personId);

    if (interactions) {
      interactions.push(interaction);
    } else {
      interactionsByPersonId.set(personId, [interaction]);
    }
  }

  // Recomputed from the person's latest emails rather than incremented, so a
  // batch arriving out of order cannot skew it.
  const lastSenderStreakByPersonId = await collectLastSenderStreaks(
    client,
    [...interactionsByPersonId.keys()],
    interactionByMessageId,
  );

  await applyPersonInteractions(
    client,
    interactionsByPersonId,
    lastSenderStreakByPersonId,
  );
};
