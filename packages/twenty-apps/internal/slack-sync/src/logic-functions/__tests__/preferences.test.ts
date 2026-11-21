import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settings } from 'src/logic-functions/settings';
import { slackHealthCheck } from 'src/logic-functions/health-check';

const mocks = vi.hoisted(() => ({
  listConnections: vi.fn(),
  listMessageChannels: vi.fn(),
  listMessageFolders: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  updateMessageChannel: vi.fn(),
  syncMessageFolders: vi.fn(),
  enqueueJobs: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  syncMessageFolders: mocks.syncMessageFolders,
  enqueueJobs: mocks.enqueueJobs,
  listConnections: mocks.listConnections,
  listMessageChannels: mocks.listMessageChannels,
  listMessageFolders: mocks.listMessageFolders,
  kv: { get: mocks.get, set: mocks.set },
  updateMessageChannel: mocks.updateMessageChannel,
  Response: class {
    status?: number;
    constructor(
      public body: unknown,
      options?: { status?: number },
    ) {
      this.status = options?.status;
    }
  },
}));

describe('member Slack app preferences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads only the current member import summary and offers genuine live connections', async () => {
    mocks.listConnections.mockResolvedValue([
      { id: 'snapshot', accessToken: null },
      { id: 'live', name: 'Slack', accessToken: 'private-test-token' },
    ]);
    mocks.listMessageChannels.mockResolvedValue([{ id: 'channel' }]);
    mocks.listMessageFolders.mockResolvedValue([
      { id: 'folder', externalId: 'C1', name: 'Client', isSynced: true },
    ]);
    mocks.get.mockImplementation(async (key) =>
      key.startsWith('preview-import:')
        ? { channel: '#test', messages: 1 }
        : null,
    );
    const result = await settings({ userWorkspaceId: 'viewer' } as Parameters<
      typeof settings
    >[0]);
    expect(mocks.get).toHaveBeenCalledWith('preview-import:viewer');
    expect(result).toMatchObject({
      accounts: [{ id: 'live' }],
      snapshotImport: { channel: '#test' },
    });
    expect(JSON.stringify(result)).not.toContain('private-test-token');
    expect(mocks.listMessageChannels).toHaveBeenCalledTimes(1);
  });

  it('does not read private import details for an unauthenticated request', async () => {
    expect(await settings({} as Parameters<typeof settings>[0])).toMatchObject({
      status: 401,
    });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('saves only the signed-in member preferences and applies native email-style channel options', async () => {
    mocks.listConnections.mockResolvedValue([{ id: 'own', accessToken: null }]);
    mocks.listMessageChannels.mockResolvedValue([{ id: 'own-channel' }]);
    mocks.get.mockResolvedValue(null);
    const preferences = {
      policy: 'SENT',
      excludeGroupEmails: true,
      excludeNonProfessionalEmails: false,
      employeeDomains: ['Company.example'],
    };
    const result = await settings({
      userWorkspaceId: 'viewer',
      body: { contactPreferences: preferences },
    } as Parameters<typeof settings>[0]);
    expect(mocks.updateMessageChannel).toHaveBeenCalledWith({
      id: 'own-channel',
      isContactAutoCreationEnabled: true,
      contactAutoCreationPolicy: 'SENT',
      excludeGroupEmails: true,
      excludeNonProfessionalEmails: false,
    });
    expect(mocks.set).toHaveBeenCalledWith('contact-preferences:viewer', {
      ...preferences,
      employeeDomains: ['company.example'],
    });
    expect(result).toMatchObject({ contactPreferences: { policy: 'SENT' } });
  });

  it('rejects invalid domains without changing creation settings', async () => {
    mocks.listConnections.mockResolvedValue([]);
    mocks.get.mockResolvedValue(null);
    const result = await settings({
      userWorkspaceId: 'viewer',
      body: {
        contactPreferences: {
          policy: 'SENT',
          excludeGroupEmails: true,
          excludeNonProfessionalEmails: true,
          employeeDomains: ['https://example.com'],
        },
      },
    } as Parameters<typeof settings>[0]);
    expect(result).toMatchObject({ status: 400 });
    expect(mocks.updateMessageChannel).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('uses the native app preferences route like LinkedIn', async () => {
    vi.stubEnv('APPLICATION_ID', 'app');
    expect(await slackHealthCheck()).toMatchObject({
      action: {
        label: 'Open app preferences',
        location: '/settings/app-preferences/app',
      },
    });
    vi.unstubAllEnvs();
  });
});

describe('bulk conversation selection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.listConnections.mockResolvedValue([
      { id: 'own', accessToken: 'test-token' },
    ]);
    mocks.listMessageChannels.mockResolvedValue([
      { id: 'channel', isSyncEnabled: true },
    ]);
    mocks.listMessageFolders.mockResolvedValue([
      { externalId: 'C1', name: 'Sales', isSynced: true },
      { externalId: 'D1', name: 'Alex', isSynced: false },
      { externalId: 'D2', name: 'Sam', isSynced: false },
    ]);
    mocks.get.mockResolvedValue(null);
    mocks.enqueueJobs.mockResolvedValue({ enqueued: true });
  });
  const request = (conversationIds: string[], connectedAccountId = 'own') =>
    ({
      userWorkspaceId: 'viewer',
      body: {
        conversationSelections: [{ connectedAccountId, conversationIds }],
        history: 'ALL',
      },
    }) as Parameters<typeof settings>[0];
  it('shows unsynced DMs and channels so they can be selected', async () => {
    const result = await settings({ userWorkspaceId: 'viewer' } as Parameters<
      typeof settings
    >[0]);
    expect(result).toMatchObject({
      accounts: [
        {
          folders: [
            { id: 'C1', isSynced: true, kind: 'CHANNEL' },
            { id: 'D1', isSynced: false, kind: 'DM' },
            { id: 'D2', isSynced: false, kind: 'DM' },
          ],
        },
      ],
    });
  });
  it('saves multiple selections and queues their full history in one batch', async () => {
    await settings(request(['D1', 'D2']));
    expect(mocks.syncMessageFolders).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        folders: [
          { externalId: 'C1', name: 'Sales', isSynced: false },
          { externalId: 'D1', name: 'Alex', isSynced: true },
          { externalId: 'D2', name: 'Sam', isSynced: true },
        ],
      }),
    );
    expect(mocks.enqueueJobs).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        jobs: [
          {
            payload: expect.objectContaining({ channelId: 'D1', oldest: '0' }),
          },
          {
            payload: expect.objectContaining({ channelId: 'D2', oldest: '0' }),
          },
        ],
      }),
    );
    expect(mocks.set).toHaveBeenCalledWith('sync-history:own', 'ALL');
  });
  it('rejects another member connection before changing any selections', async () => {
    expect(await settings(request(['D1'], 'someone-else'))).toMatchObject({
      status: 403,
    });
    expect(mocks.syncMessageFolders).not.toHaveBeenCalled();
    expect(mocks.enqueueJobs).not.toHaveBeenCalled();
  });
  it('rejects an unknown conversation before saving', async () => {
    expect(await settings(request(['unknown']))).toMatchObject({ status: 400 });
    expect(mocks.syncMessageFolders).not.toHaveBeenCalled();
  });
  it('supports clearing all selections without queuing a history import', async () => {
    await settings(request([]));
    expect(mocks.syncMessageFolders).toHaveBeenCalledWith(
      expect.objectContaining({
        folders: expect.arrayContaining([
          expect.objectContaining({ externalId: 'C1', isSynced: false }),
          expect.objectContaining({ externalId: 'D1', isSynced: false }),
        ]),
      }),
    );
    expect(mocks.enqueueJobs).not.toHaveBeenCalled();
  });
  it('retries a history request after selection was saved but the queue failed', async () => {
    mocks.listMessageFolders.mockResolvedValue([
      { externalId: 'D1', name: 'Alex', isSynced: true },
    ]);
    mocks.enqueueJobs.mockResolvedValueOnce({ enqueued: false });
    await expect(settings(request(['D1']))).rejects.toThrow(
      'could not be queued',
    );
    expect(mocks.set).not.toHaveBeenCalledWith(
      'sync-history-queued:own',
      expect.anything(),
    );
    mocks.enqueueJobs.mockResolvedValueOnce({ enqueued: true });
    await settings(request(['D1']));
    expect(mocks.enqueueJobs).toHaveBeenCalledTimes(2);
    expect(mocks.set).toHaveBeenCalledWith('sync-history-queued:own', {
      D1: 'ALL',
    });
  });
  it('does not queue history again for unchanged sync settings', async () => {
    mocks.get.mockImplementation(async (key) =>
      key === 'sync-history-queued:own' ? { C1: 'ALL' } : null,
    );
    await settings(request(['C1']));
    expect(mocks.enqueueJobs).not.toHaveBeenCalled();
  });
});
