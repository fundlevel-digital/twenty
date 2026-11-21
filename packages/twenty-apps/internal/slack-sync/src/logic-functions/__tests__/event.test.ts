import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEvent } from 'src/logic-functions/event';
const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  listConnections: vi.fn(),
  listMessageChannels: vi.fn(),
  listMessageFolders: vi.fn(),
  ingestMessages: vi.fn(),
  slackRequest: vi.fn(),
  enqueue: vi.fn(),
  updateMessages: vi.fn(),
  set: vi.fn(),
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  ...mocks,
  kv: { set: mocks.set },
}));
vi.mock('src/utils/slack', () => ({
  slackRequest: mocks.slackRequest,
  timestampDate: (timestamp: string) =>
    new Date(Number(timestamp) * 1000).toISOString(),
  slackIdentity: (team: string, channel: string, timestamp: string) =>
    `${team}:${channel}:${timestamp}`,
  SlackRateLimitError: class extends Error {},
}));
vi.mock('src/utils/queue', () => ({ enqueue: mocks.enqueue }));
vi.mock('src/utils/update-messages', () => ({
  updateMessages: mocks.updateMessages,
}));
vi.mock('src/utils/map-message', () => ({ mapMessage: vi.fn() }));
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
});
const payload = {
  type: 'event_callback',
  team_id: 'T',
  event_id: 'Ev',
  connectedAccountId: 'a',
  event: {
    type: 'message',
    channel: 'C',
    subtype: 'message_deleted',
    deleted_ts: '100',
    event_ts: '200',
  },
};
describe('Slack per-token event authorization', () => {
  it('ignores excluded conversations before accessing message content', async () => {
    mocks.listMessageFolders.mockResolvedValue([
      { externalId: 'C', isSynced: false },
    ]);
    await handleEvent(payload);
    expect(mocks.slackRequest).not.toHaveBeenCalled();
    expect(mocks.updateMessages).not.toHaveBeenCalled();
  });
  it('rejects a connection no longer in a public channel', async () => {
    mocks.slackRequest.mockResolvedValue({ members: ['SOMEONE_ELSE'] });
    await handleEvent(payload);
    expect(mocks.updateMessages).not.toHaveBeenCalled();
  });
  it('stores a tombstone and updates an authorized deleted message', async () => {
    mocks.slackRequest.mockResolvedValue({ members: ['U'] });
    await handleEvent(payload);
    expect(mocks.set).toHaveBeenCalledWith(
      'deleted:T:C:100',
      '1970-01-01T00:03:20.000Z',
    );
    expect(mocks.updateMessages).toHaveBeenCalledWith({
      messageChannelId: 'channel',
      messages: [
        {
          externalId: 'T:C:100',
          providerMetadata: {
            deletedAt: '1970-01-01T00:03:20.000Z',
            updatedAt: '1970-01-01T00:03:20.000Z',
          },
        },
      ],
    });
  });
});
