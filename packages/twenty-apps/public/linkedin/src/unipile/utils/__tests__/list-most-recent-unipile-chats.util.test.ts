import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type UnipileChat } from 'src/unipile/types/unipile-chat.type';
import { listMostRecentUnipileChats } from 'src/unipile/utils/list-most-recent-unipile-chats.util';

const getInboxChatsList = vi.fn();

vi.mock('@unipile/sdk', () => ({
  UnipileMessaging: class {
    getInboxChatsList = getInboxChatsList;
  },
}));

vi.mock('src/unipile/utils/get-unipile-request-options.util', () => ({
  getUnipileRequestOptions: () => ({}),
}));

const buildChats = (count: number, offset: number): UnipileChat[] =>
  Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `chat-${offset + index}`,
        timestamp: new Date(2026, 0, 1, 0, offset + index).toISOString(),
      }) as unknown as UnipileChat,
  );

describe('listMostRecentUnipileChats', () => {
  beforeEach(() => {
    getInboxChatsList.mockReset();
  });

  it('pages through LinkedIn chats 25 at a time', async () => {
    getInboxChatsList
      .mockResolvedValueOnce({
        data: { data: buildChats(25, 0), next_cursor: 'page-2' },
        response: { status: 200 },
      })
      .mockResolvedValueOnce({
        data: { data: buildChats(25, 25), next_cursor: 'page-3' },
        response: { status: 200 },
      });

    const chats = await listMostRecentUnipileChats({
      accountId: 'account',
      inboxIds: ['inbox'],
      limit: 50,
    });

    expect(chats).toHaveLength(50);
    expect(
      getInboxChatsList.mock.calls.map(([options]) => options.query.limit),
    ).toEqual([25, 25]);
  });
});
