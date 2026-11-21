import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  getConnection: vi.fn(),
  listMessageChannels: vi.fn(),
  enqueueJobs: vi.fn(),
  listChats: vi.fn(),
  listMessages: vi.fn(),
  getChat: vi.fn(),
  ingest: vi.fn(),
  history: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  getConnection: mocks.getConnection,
  listMessageChannels: mocks.listMessageChannels,
  enqueueJobs: mocks.enqueueJobs,
  kv: {
    get: async (key: string) => mocks.store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mocks.store.set(key, structuredClone(value));
    },
    delete: async (key: string) => mocks.store.delete(key),
  },
}));
vi.mock('src/unipile/utils/with-unipile-account-request.util', () => ({
  withLinkedinLease: (_key: string, operation: () => Promise<unknown>) =>
    operation(),
  UnipileAccountBusyError: class extends Error {},
}));
vi.mock('src/logic-functions/utils/get-linkedin-settings.util', () => ({
  getLinkedinSettings: async () => ({ importPolicy: 'ALL' }),
}));
vi.mock(
  'src/logic-functions/utils/get-linkedin-history-import-state.util',
  () => ({ getLinkedinHistoryImportState: mocks.history }),
);
vi.mock(
  'src/logic-functions/utils/create-linkedin-counterpart-resolver.util',
  () => ({ createLinkedinCounterpartResolver: () => vi.fn() }),
);
vi.mock('src/logic-functions/utils/ingest-linkedin-messages.util', () => ({
  ingestLinkedinMessages: mocks.ingest,
}));
vi.mock('src/unipile/utils/get-unipile-chat.util', () => ({
  getUnipileChat: mocks.getChat,
}));
vi.mock('src/unipile/utils/list-unipile-chats.util', () => ({
  listUnipileChats: mocks.listChats,
}));
vi.mock('src/unipile/utils/list-unipile-chat-messages-page.util', () => ({
  listUnipileChatMessagesPage: mocks.listMessages,
}));
vi.mock('src/unipile/utils/list-unipile-inbox-ids.util', () => ({
  listUnipileInboxIds: async () => ['CLASSIC_PRIMARY'],
}));
const { linkedinCatchUpAccountHandler } =
  await import('src/logic-functions/linkedin-catch-up-account');
const run = () =>
  linkedinCatchUpAccountHandler({ connectedAccountId: 'connection' });
const message = (id: string, timestamp: string) => ({ id, timestamp });

describe('member catch-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.clear();
    mocks.getConnection.mockResolvedValue({ externalAccountId: 'account' });
    mocks.listMessageChannels.mockResolvedValue([
      { id: 'channel', handle: 'me' },
    ]);
    mocks.history.mockResolvedValue(null);
    mocks.getChat.mockResolvedValue({ id: 'chat', user: { id: 'person' } });
    mocks.listChats.mockResolvedValue({ items: [{ id: 'chat' }] });
    mocks.ingest.mockResolvedValue({ ingestedMessageCount: 1 });
    mocks.store.set('linkedin-connected-at:connection', '2026-11-21T00:00:00Z');
  });
  it('pages past the newest page until the previously stored watermark is reached', async () => {
    mocks.listMessages
      .mockResolvedValueOnce({
        items: [message('new', '2026-11-21T01:00:00Z')],
        nextCursor: 'older',
      })
      .mockResolvedValueOnce({
        items: [message('old', '2026-11-20T23:00:00Z')],
        nextCursor: 'still-older',
      });
    await expect(run()).resolves.toEqual({ completed: true });
    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(mocks.listMessages).toHaveBeenLastCalledWith({
      accountId: 'account',
      chatId: 'chat',
      cursor: 'older',
    });
    expect(mocks.store.get('linkedin-chat-watermark:connection:chat')).toBe(
      '2026-11-21T01:00:00Z',
    );
  });
  it('does not advance a watermark or cursor when ingestion fails', async () => {
    mocks.listMessages.mockResolvedValue({
      items: [message('new', '2026-11-21T01:00:00Z')],
      nextCursor: 'older',
    });
    mocks.ingest.mockRejectedValueOnce(new Error('write failed'));
    await expect(run()).rejects.toThrow('write failed');
    expect(mocks.store.has('linkedin-chat-watermark:connection:chat')).toBe(
      false,
    );
    expect(mocks.store.get('linkedin-catch-up:connection')).toMatchObject({
      chatIds: ['chat'],
      chatIndex: 0,
    });
  });
  it('resumes a frozen chat page even if inbox ordering changes', async () => {
    mocks.store.set('linkedin-catch-up:connection', {
      inboxIndex: 0,
      chatIds: ['chat'],
      chatIndex: 0,
      messageCursor: 'resume',
      cutoff: '2026-11-21T00:00:00Z',
    });
    mocks.listMessages.mockResolvedValue({ items: [] });
    await run();
    expect(mocks.listChats).not.toHaveBeenCalled();
    expect(mocks.listMessages).toHaveBeenCalledWith({
      accountId: 'account',
      chatId: 'chat',
      cursor: 'resume',
    });
  });
  it('leaves a running full-history import to its own resumable jobs', async () => {
    mocks.history.mockResolvedValue({ status: 'IMPORTING' });
    await expect(run()).resolves.toEqual({ skipped: true });
    expect(mocks.listChats).not.toHaveBeenCalled();
  });
});

it('does not import old messages when past conversations are disabled', async () => {
  mocks.store.clear();
  mocks.store.set('linkedin-connected-at:connection', '2026-11-21T00:00:00Z');
  mocks.getConnection.mockResolvedValue({ externalAccountId: 'account' });
  mocks.listMessageChannels.mockResolvedValue([
    { id: 'channel', handle: 'me' },
  ]);
  mocks.history.mockResolvedValue(null);
  mocks.getChat.mockResolvedValue({ id: 'chat', user: { id: 'person' } });
  mocks.listChats.mockResolvedValue({ items: [{ id: 'chat' }] });
  mocks.listMessages.mockResolvedValue({
    items: [message('old', '2026-11-20T23:00:00Z')],
  });
  mocks.ingest.mockClear();
  await run();
  expect(mocks.ingest).not.toHaveBeenCalled();
  expect(mocks.store.get('linkedin-chat-watermark:connection:chat')).toBe(
    '2026-11-21T00:00:00Z',
  );
});
