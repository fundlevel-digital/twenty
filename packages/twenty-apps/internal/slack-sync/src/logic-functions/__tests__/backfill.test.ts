vi.mock('src/utils/ingest-message', () => ({
  ingestSlackMessage: mocks.ingestMessages,
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backfill } from 'src/logic-functions/backfill';
const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  listMessageChannels: vi.fn(),
  listMessageFolders: vi.fn(),
  ingestMessages: vi.fn(),
  slackRequest: vi.fn(),
  enqueue: vi.fn(),
  mapMessage: vi.fn(),
  set: vi.fn(),
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  ...mocks,
  kv: { get: vi.fn().mockResolvedValue(null), set: mocks.set },
}));
vi.mock('src/utils/slack', () => ({
  slackRequest: mocks.slackRequest,
  SlackRateLimitError: class extends Error {},
}));
vi.mock('src/utils/queue', () => ({ enqueue: mocks.enqueue }));
vi.mock('src/utils/map-message', () => ({ mapMessage: mocks.mapMessage }));
const payload = {
  connectedAccountId: 'a',
  channelId: 'C',
  oldest: '100',
  latest: '200',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getConnection.mockResolvedValue({
    id: 'a',
    accessToken: 'token',
    externalAccountId: 'T:U',
  });
  mocks.listMessageChannels.mockResolvedValue([
    { id: 'channel', isSyncEnabled: true },
  ]);
  mocks.listMessageFolders.mockResolvedValue([
    { externalId: 'C', name: 'Client', isSynced: true },
  ]);
  mocks.mapMessage.mockResolvedValue({ externalId: 'message' });
});
describe('Slack history jobs', () => {
  it('never imports a disabled conversation', async () => {
    mocks.listMessageFolders.mockResolvedValue([
      { externalId: 'C', isSynced: false },
    ]);
    await backfill(payload);
    expect(mocks.slackRequest).not.toHaveBeenCalled();
    expect(mocks.ingestMessages).not.toHaveBeenCalled();
  });
  it('queues thread replies and the next history cursor', async () => {
    mocks.slackRequest.mockResolvedValue({
      messages: [{ ts: '150.001', user: 'U', text: 'Hello', reply_count: 2 }],
      response_metadata: { next_cursor: 'next' },
    });
    await backfill(payload);
    expect(mocks.ingestMessages).toHaveBeenCalled();
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        threadTimestamp: '150.001',
        oldest: '100',
        latest: '200',
      }),
    );
    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cursor: 'next', oldest: '100', latest: '200' }),
    );
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('marks history done only on the last page', async () => {
    mocks.slackRequest.mockResolvedValue({ messages: [] });
    await backfill(payload);
    expect(mocks.set).toHaveBeenCalledWith('imported:a:C', true);
  });
});
