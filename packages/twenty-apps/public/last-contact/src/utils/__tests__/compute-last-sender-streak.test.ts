import { describe, expect, it } from 'vitest';

import { LAST_SENDER_STREAK_MAX } from 'src/constants/last-sender-streak';
import {
  computeLastSenderStreak,
  type LastSenderStreakMessage,
} from 'src/utils/compute-last-sender-streak';
import { type InteractionDirection } from 'src/utils/update-person-last-contact';

const buildMessages = (
  directions: InteractionDirection[],
): LastSenderStreakMessage[] =>
  directions.map((direction, index) => ({
    messageId: `message-${String(index).padStart(3, '0')}`,
    receivedAt: new Date(Date.UTC(2026, 5, 1, 9, index)).toISOString(),
    direction,
  }));

const streakAfter = (directions: InteractionDirection[]) =>
  computeLastSenderStreak(buildMessages(directions));

describe('computeLastSenderStreak', () => {
  it('is null without messages', () => {
    expect(computeLastSenderStreak([])).toBeNull();
  });

  it('counts each turn of a conversation', () => {
    expect(streakAfter(['inbound'])).toBe(1);
    expect(streakAfter(['inbound', 'outbound'])).toBe(1);
    expect(streakAfter(['inbound', 'outbound', 'outbound'])).toBe(2);
    expect(streakAfter(['inbound', 'outbound', 'outbound', 'outbound'])).toBe(
      3,
    );
    expect(
      streakAfter(['inbound', 'outbound', 'outbound', 'outbound', 'inbound']),
    ).toBe(1);
  });

  it('orders by receivedAt whatever the input order', () => {
    const messages = buildMessages(['inbound', 'outbound', 'outbound']);

    expect(computeLastSenderStreak([...messages].reverse())).toBe(2);
  });

  it('breaks receivedAt ties by the highest message id first', () => {
    const receivedAt = '2026-06-01T09:00:00.000Z';
    const messages: LastSenderStreakMessage[] = [
      { messageId: 'message-b', receivedAt, direction: 'inbound' },
      { messageId: 'message-a', receivedAt, direction: 'outbound' },
      {
        messageId: 'message-c',
        receivedAt: '2026-05-31T09:00:00.000Z',
        direction: 'inbound',
      },
    ];

    expect(computeLastSenderStreak(messages)).toBe(1);
    expect(computeLastSenderStreak([...messages].reverse())).toBe(1);
    expect(
      computeLastSenderStreak([
        { ...messages[0], direction: 'outbound' },
        messages[1],
        messages[2],
      ]),
    ).toBe(2);
  });

  it('counts a message the person appears on twice once', () => {
    const [first, second] = buildMessages(['outbound', 'outbound']);

    expect(computeLastSenderStreak([first, second, second])).toBe(2);
  });

  it(`stops counting at ${LAST_SENDER_STREAK_MAX}`, () => {
    expect(
      streakAfter(
        Array.from(
          { length: LAST_SENDER_STREAK_MAX + 10 },
          (): InteractionDirection => 'inbound',
        ),
      ),
    ).toBe(LAST_SENDER_STREAK_MAX);
  });
});
