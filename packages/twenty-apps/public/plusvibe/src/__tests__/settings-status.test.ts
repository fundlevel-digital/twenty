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
      name: 'PlusVibe #1',
      externalAccountId: 'first-fingerprint',
      accessToken: 'first-secret',
      authFailedAt: null,
    },
    {
      id: 'second',
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
