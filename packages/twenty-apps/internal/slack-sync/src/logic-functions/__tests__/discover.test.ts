vi.mock('src/utils/slack-channel', () => ({
  upsertSlackChannel: vi
    .fn()
    .mockImplementation(async (_teamId, channel) => `record-${channel.id}`),
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discover } from 'src/logic-functions/discover';
const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  listConnections: vi.fn(),
  listMessageChannels: vi.fn(),
  listMessageFolders: vi.fn(),
  syncMessageFolders: vi.fn(),
  slackRequest: vi.fn(),
  enqueue: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  ...mocks,
  kv: { get: mocks.get, set: mocks.set },
}));
vi.mock('src/utils/slack', () => ({
  slackRequest: mocks.slackRequest,
  SlackRateLimitError: class extends Error {},
}));
vi.mock('src/utils/queue', () => ({ enqueue: mocks.enqueue }));
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
    { externalId: 'existing', name: 'Existing', isSynced: false },
  ]);
  mocks.syncMessageFolders.mockResolvedValue([]);
  mocks.slackRequest.mockImplementation(async (_token, method, parameters) => {
    if (method === 'users.conversations')
      return {
        channels: [{ id: 'existing' }, { id: 'new' }],
        response_metadata: { next_cursor: 'next' },
      };
    return {
      channel: {
        id: parameters.channel,
        name: parameters.channel,
        is_ext_shared: true,
      },
    };
  });
});
describe('paged conversation discovery', () => {
  it('preserves deselected folders and enables new Slack Connect folders', async () => {
    await discover({ connectedAccountId: 'a' });
    expect(mocks.syncMessageFolders).toHaveBeenCalledWith({
      messageChannelId: 'channel',
      isPartial: true,
      folders: [
        {
          externalId: 'existing',
          name: 'existing',
          applicationRecordId: 'record-existing',
        },
        {
          externalId: 'new',
          applicationRecordId: 'record-new',
          name: 'new',
          isSynced: true,
        },
      ],
    });
  });
  it('only queues a continuation after current folder changes persist', async () => {
    mocks.syncMessageFolders.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(discover({ connectedAccountId: 'a' })).rejects.toThrow(
      'Database unavailable',
    );
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
