import { describe, expect, it } from 'vitest';

import {
  computeLastSenderStreak,
  type StreakMessage,
} from 'src/utils/compute-last-sender-streak';

describe('email streak', () => {
  it('follows the reply and follow-up sequence 1, 1, 2, 3, 1', () => {
    const messages: StreakMessage[] = [];

    for (const [index, direction] of (
      ['inbound', 'outbound', 'outbound', 'outbound', 'inbound'] as const
    ).entries()) {
      messages.push({
        id: String(index),
        receivedAt: `2026-11-20T12:0${index}:00Z`,
        direction,
      });
      expect(computeLastSenderStreak(messages)).toBe([1, 1, 2, 3, 1][index]);
    }
  });

  it('counts each email once, regardless of duplicate recipients or input order', () => {
    const message: StreakMessage = {
      id: '2',
      receivedAt: '2026-11-20T12:00:00Z',
      direction: 'outbound',
    };
    expect(
      computeLastSenderStreak([
        message,
        { id: '1', receivedAt: '2026-11-19T12:00:00Z', direction: 'inbound' },
        { id: '3', receivedAt: '2026-11-20T13:00:00Z', direction: 'outbound' },
        message,
      ]),
    ).toBe(2);
  });

  it('orders timestamps chronologically across UTC offsets and breaks ties by id', () => {
    expect(
      computeLastSenderStreak([
        {
          id: '1',
          receivedAt: '2026-11-20T11:00:00-05:00',
          direction: 'outbound',
        },
        { id: '2', receivedAt: '2026-11-20T15:00:00Z', direction: 'inbound' },
        { id: '3', receivedAt: '2026-11-20T15:30:00Z', direction: 'outbound' },
      ]),
    ).toBe(2);
    expect(
      computeLastSenderStreak([
        { id: '2', receivedAt: '2026-11-20T16:00:00Z', direction: 'outbound' },
        { id: '1', receivedAt: '2026-11-20T16:00:00Z', direction: 'inbound' },
        { id: '3', receivedAt: '2026-11-20T17:00:00Z', direction: 'outbound' },
      ]),
    ).toBe(2);
  });

  it('returns empty without email and caps long streaks at 50', () => {
    expect(computeLastSenderStreak([])).toBeNull();
    expect(
      computeLastSenderStreak(
        Array.from({ length: 70 }, (_, index) => ({
          id: String(index),
          receivedAt: '2026-11-20T12:00:00Z',
          direction: 'inbound',
        })),
      ),
    ).toBe(50);
  });
});
