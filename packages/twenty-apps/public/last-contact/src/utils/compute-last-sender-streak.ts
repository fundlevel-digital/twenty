import { LAST_SENDER_STREAK_MAX } from 'src/constants/last-sender-streak';
import { type InteractionDirection } from 'src/utils/update-person-last-contact';

export type LastSenderStreakMessage = {
  messageId: string;
  receivedAt: string;
  direction: InteractionDirection;
};

const compareNewestFirst = (
  left: LastSenderStreakMessage,
  right: LastSenderStreakMessage,
): number => {
  if (left.receivedAt !== right.receivedAt) {
    return left.receivedAt < right.receivedAt ? 1 : -1;
  }

  if (left.messageId === right.messageId) {
    return 0;
  }

  return left.messageId < right.messageId ? 1 : -1;
};

// Messages sharing a receivedAt are ordered by id, descending, the same
// tie-break the real-time query asks the API for.
const sortMessagesNewestFirst = (
  messages: LastSenderStreakMessage[],
): LastSenderStreakMessage[] => {
  const messageById = new Map(
    messages.map((message) => [message.messageId, message]),
  );

  return [...messageById.values()].sort(compareNewestFirst);
};

export const computeLastSenderStreak = (
  messages: LastSenderStreakMessage[],
): number | null => {
  const [latest, ...older] = sortMessagesNewestFirst(messages);

  if (!latest) {
    return null;
  }

  let streak = 1;

  for (const message of older) {
    if (
      streak >= LAST_SENDER_STREAK_MAX ||
      message.direction !== latest.direction
    ) {
      break;
    }

    streak += 1;
  }

  return streak;
};
