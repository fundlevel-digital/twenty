import { describe, expect, it, vi } from 'vitest';

import { LAST_SENDER_STREAK_MAX } from 'src/constants/last-sender-streak';
import { collectLastSenderStreaks } from 'src/utils/collect-last-sender-streaks';
import { type MessageInteraction } from 'src/utils/collect-message-interactions';

const PERSON_ID = '11111111-1111-1111-1111-111111111111';
const SILENT_PERSON_ID = '22222222-2222-2222-2222-222222222222';

type RecentRow = {
  messageId: string;
  message: { receivedAt: string | null; isDraft: boolean };
};

const buildRow = (index: number, isDraft = false): RecentRow => ({
  messageId: `message-${String(index).padStart(3, '0')}`,
  message: {
    receivedAt: new Date(Date.UTC(2026, 5, 1, 9, 0, 100 - index)).toISOString(),
    isDraft,
  },
});

const inbound = (receivedAt: string): MessageInteraction => ({
  receivedAt,
  workspaceMemberId: null,
  direction: 'inbound',
});

// Serves the person's rows in pages, and every other message as inbound.
const buildClient = (pages: RecentRow[][]) => {
  const client = {
    query: vi.fn((query) => {
      const { filter, after } = query.messageParticipants.__args;

      if (filter.personId) {
        const rows = filter.personId.eq === PERSON_ID ? pages : [[]];
        const pageIndex = after ? Number(after) : 0;

        return Promise.resolve({
          messageParticipants: {
            edges: rows[pageIndex].map((node) => ({ node })),
            pageInfo: {
              hasNextPage: pageIndex + 1 < rows.length,
              endCursor: String(pageIndex + 1),
            },
          },
        });
      }

      const messageIds: string[] = filter.and[0].messageId.in;

      return Promise.resolve({
        messageParticipants: {
          edges: messageIds.map((messageId) => ({
            node: {
              messageId,
              role: 'FROM',
              workspaceMemberId: null,
              message: { receivedAt: '2026-06-01T09:00:00.000Z' },
            },
          })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });
    }),
    mutation: vi.fn(),
  };

  return client;
};

const recentQueries = (client: ReturnType<typeof buildClient>) =>
  client.query.mock.calls.filter(
    ([query]) => query.messageParticipants.__args.filter.personId,
  );

describe('collectLastSenderStreaks', () => {
  it('is null for a person without emails', async () => {
    const client = buildClient([[]]);

    const streaks = await collectLastSenderStreaks(
      client as never,
      [SILENT_PERSON_ID],
      new Map(),
    );

    expect(streaks.get(SILENT_PERSON_ID)).toBeNull();
  });

  it('reuses the interactions already resolved for the batch', async () => {
    const row = buildRow(0);
    const client = buildClient([[row]]);

    const streaks = await collectLastSenderStreaks(
      client as never,
      [PERSON_ID],
      new Map([[row.messageId, inbound(row.message.receivedAt as string)]]),
    );

    expect(streaks.get(PERSON_ID)).toBe(1);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('reads further pages while drafts and repeated messages leave too few emails', async () => {
    const firstPage = [
      buildRow(0),
      buildRow(0),
      ...Array.from({ length: LAST_SENDER_STREAK_MAX - 2 }, (_, index) =>
        buildRow(index + 1, index % 2 === 0),
      ),
    ];
    const secondPage = Array.from(
      { length: LAST_SENDER_STREAK_MAX },
      (_, index) => buildRow(LAST_SENDER_STREAK_MAX + index),
    );
    const client = buildClient([firstPage, secondPage, [buildRow(200)]]);

    const streaks = await collectLastSenderStreaks(
      client as never,
      [PERSON_ID],
      new Map(),
    );

    expect(recentQueries(client)).toHaveLength(2);
    expect(streaks.get(PERSON_ID)).toBe(LAST_SENDER_STREAK_MAX);
  });

  it('stops reading once enough emails are known', async () => {
    const client = buildClient([
      Array.from({ length: LAST_SENDER_STREAK_MAX }, (_, index) =>
        buildRow(index),
      ),
      [buildRow(200)],
    ]);

    await collectLastSenderStreaks(client as never, [PERSON_ID], new Map());

    expect(recentQueries(client)).toHaveLength(1);
  });
});
