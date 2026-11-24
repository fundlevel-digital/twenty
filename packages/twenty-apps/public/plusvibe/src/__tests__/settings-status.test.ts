vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  getSyncWorkerHealth: vi.fn(),
  getSyncSummary: vi.fn(async () => ({
    pending: 0,
    failed: 0,
    completed: 0,
    sourceLeads: 0,
    importedLeads: 0,
    sourceEmails: 0,
    importedEmails: 0,
  })),
}));
import { beforeEach, expect, it, vi } from 'vitest';

const { values, listConnections, listWorkspaces, findMailConnection } =
  vi.hoisted(() => ({
    values: new Map<string, unknown>(),
    listConnections: vi.fn(),
    listWorkspaces: vi.fn(),
    findMailConnection: vi.fn(),
  }));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  listConnections,
  getJobs: vi.fn(async () => []),
  kv: { get: vi.fn(async (key: string) => values.get(key) ?? null) },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({ listWorkspaces }));
vi.mock('src/logic-functions/utils/native-email', () => ({
  findMailConnection,
}));
vi.mock('src/logic-functions/utils/require-application-manager', () => ({
  canManageApplication: vi.fn(async () => true),
}));

import { getRegistrationKey, SELECTION_KEY } from 'src/constants/plusvibe';
import { settingsStatusHandler } from 'src/logic-functions/settings-status';

beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  findMailConnection.mockResolvedValue({ id: 'mail' });
});

it('returns separate connection health and selections without returning credentials', async () => {
  listConnections.mockResolvedValue([
    {
      id: 'first',
      providerName: 'plusvibe',
      name: 'PlusVibe #1',
      externalAccountId: 'first-fingerprint',
      accessToken: 'first-secret',
      authFailedAt: null,
    },
    {
      id: 'second',
      providerName: 'plusvibe',
      name: 'PlusVibe #2',
      externalAccountId: 'second-fingerprint',
      accessToken: 'second-secret',
      authFailedAt: null,
    },
  ]);
  values.set(SELECTION_KEY, ['workspace-1', 'workspace-2']);
  values.set(getRegistrationKey('workspace-1'), {
    apiKeyFingerprint: 'first-fingerprint',
  });
  values.set(getRegistrationKey('workspace-2'), {
    apiKeyFingerprint: 'second-fingerprint',
  });
  listWorkspaces.mockImplementation(async (connectionId: string) => {
    if (connectionId === 'first') throw new Error('Invalid key');
    return [{ _id: 'workspace-2', name: 'Second Workspace' }];
  });
  const status = await settingsStatusHandler();
  expect(status).toMatchObject({
    accounts: [
      {
        id: 'first',
        hasAccountError: true,
        isMailConnected: false,
        selectedWorkspaceIds: ['workspace-1'],
      },
      {
        id: 'second',
        hasAccountError: false,
        isMailConnected: true,
        selectedWorkspaceIds: ['workspace-2'],
      },
    ],
  });
  expect(JSON.stringify(status)).not.toMatch(/secret|fingerprint|accessToken/);
});

it('returns only the member’s accounts and never exposes the legacy app key as their connection', async () => {
  listConnections.mockResolvedValue([
    {
      id: 'own',
      providerName: 'plusvibe-user',
      userWorkspaceId: 'member-1',
      externalAccountId: 'same-key',
    },
    {
      id: 'other',
      providerName: 'plusvibe-user',
      userWorkspaceId: 'member-2',
      externalAccountId: 'same-key',
    },
  ]);
  listWorkspaces.mockResolvedValue([]);
  values.set(SELECTION_KEY, ['own-workspace', 'other-workspace']);
  values.set(getRegistrationKey('own-workspace'), {
    accountConnectionId: 'own',
    apiKeyFingerprint: 'same-key',
  });
  values.set(getRegistrationKey('other-workspace'), {
    accountConnectionId: 'other',
    apiKeyFingerprint: 'same-key',
  });
  const status = await settingsStatusHandler(undefined, {
    userWorkspaceId: 'member-1',
  });
  expect(status).toMatchObject({
    accounts: [{ id: 'own' }],
    selectedWorkspaceIds: ['own-workspace'],
    imports: { 'own-workspace': null },
  });
  expect(JSON.stringify(status)).not.toContain('other-workspace');
  listConnections.mockResolvedValue([]);
  vi.stubEnv('PLUSVIBE_API_KEY', 'app-wide-key');
  try {
    expect(
      await settingsStatusHandler(undefined, { userWorkspaceId: 'member-1' }),
    ).toMatchObject({
      isApiKeySet: false,
      accounts: [],
      selectedWorkspaceIds: [],
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
