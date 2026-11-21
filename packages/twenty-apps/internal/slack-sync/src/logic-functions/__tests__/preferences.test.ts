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
}));
vi.mock('twenty-sdk/logic-function', () => ({
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
