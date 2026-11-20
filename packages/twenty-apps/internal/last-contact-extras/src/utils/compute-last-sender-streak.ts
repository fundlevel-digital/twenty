export type StreakMessage = {
  id: string;
  receivedAt: string;
  direction: 'inbound' | 'outbound';
};

export const LAST_SENDER_STREAK_MAX = 50;

export const computeLastSenderStreak = (
  messages: StreakMessage[],
): number | null => {
  const uniqueMessages = [
    ...new Map(messages.map((message) => [message.id, message])).values(),
  ];
  const [latest, ...older] = uniqueMessages.sort(
    (left, right) =>
      new Date(right.receivedAt).getTime() -
        new Date(left.receivedAt).getTime() ||
      (left.id === right.id ? 0 : left.id < right.id ? 1 : -1),
  );

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
