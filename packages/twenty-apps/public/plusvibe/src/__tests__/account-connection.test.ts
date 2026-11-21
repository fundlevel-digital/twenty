import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { values, listConnections, getConnection, startImport, fetchRequest } =
  vi.hoisted(() => ({
    values: new Map<string, unknown>(),
    listConnections: vi.fn(),
    getConnection: vi.fn(),
    startImport: vi.fn(),
    fetchRequest: vi.fn(),
  }));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  listConnections,
  getConnection,
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/start-import', () => ({ startImport }));

import {
  ACCOUNT_CONNECTION_KEY,
  SELECTION_KEY,
  getRegistrationKey,
} from 'src/constants/plusvibe';
import { identifyAccountHandler } from 'src/logic-functions/identify-account';
import { connectionOnConnectHandler } from 'src/logic-functions/connection-on-connect';
import { findMailConnection } from 'src/logic-functions/utils/native-email';
import {
  fingerprintApiKey,
  plusvibeRequest,
  getApiKey,
  getApiKeyFingerprint,
} from 'src/logic-functions/utils/plusvibe-api';

const ACCOUNT = {
  id: 'native-account',
  providerName: 'plusvibe',
  providerType: 'api-key',
  scope: 'WORKSPACE',
  accessToken: 'native-key',
  authFailedAt: null,
  externalAccountId: fingerprintApiKey('native-key'),
};

beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  vi.stubEnv('PLUSVIBE_API_KEY', 'legacy-key');
  vi.stubGlobal('fetch', fetchRequest);
  listConnections.mockResolvedValue([]);
  getConnection.mockResolvedValue(ACCOUNT);
  fetchRequest.mockResolvedValue({
    ok: true,
    json: async () => ({ workspaces: [] }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('PlusVibe account connections', () => {
  it('reads the native credential instead of the legacy app variable', async () => {
    listConnections.mockResolvedValue([ACCOUNT]);
    expect(await getApiKey()).toBe('native-key');
    expect(await getApiKeyFingerprint()).toBe(ACCOUNT.externalAccountId);
  });

  it('keeps existing installs working without asking for their key again', async () => {
    expect(await getApiKey()).toBe('legacy-key');
  });

  it('uses the explicitly connected account when multiple connections exist', async () => {
    listConnections.mockResolvedValue([
      { ...ACCOUNT, id: 'other-account', accessToken: 'other-key' },
      ACCOUNT,
    ]);
    values.set(ACCOUNT_CONNECTION_KEY, ACCOUNT.id);
    expect(await getApiKey()).toBe('native-key');
  });

  it('does not silently choose between multiple unconfigured accounts', async () => {
    listConnections.mockResolvedValue([
      ACCOUNT,
      { ...ACCOUNT, id: 'other-account' },
    ]);
    await expect(getApiKey()).rejects.toThrow('Reconnect PlusVibe');
  });

  it('does not fall back to an old key if the native credential is revoked or missing', async () => {
    listConnections.mockResolvedValueOnce([
      { ...ACCOUNT, authFailedAt: '2026-11-20T00:00:00Z' },
    ]);
    await expect(getApiKey()).rejects.toThrow('reconnected');
    listConnections.mockResolvedValueOnce([{ ...ACCOUNT, accessToken: '' }]);
    await expect(getApiKey()).rejects.toThrow('missing its API key');
  });

  it('validates the submitted key without saving a second copy or changing sync selection', async () => {
    const result = await identifyAccountHandler({
      accessToken: ' submitted-key ',
    });
    expect(result).toEqual({
      externalAccountId: fingerprintApiKey('submitted-key'),
      handle: 'PlusVibe',
    });
    expect(fetchRequest).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'submitted-key' }),
      }),
    );
    expect(values.size).toBe(0);
  });

  it('does not accept an invalid key', async () => {
    fetchRequest.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(
      identifyAccountHandler({ accessToken: 'invalid-key' }),
    ).rejects.toThrow('401');
    expect(values.size).toBe(0);
  });

  it('accepts another key without replacing the existing connection or selection', async () => {
    values.set(SELECTION_KEY, ['workspace-1']);
    values.set(ACCOUNT_CONNECTION_KEY, ACCOUNT.id);
    await identifyAccountHandler({ accessToken: 'different-key' });
    expect(values.get(SELECTION_KEY)).toEqual(['workspace-1']);
    expect(values.get(ACCOUNT_CONNECTION_KEY)).toBe(ACCOUNT.id);
  });

  it('routes each workspace through its registered key regardless of the active connection', async () => {
    const second = {
      ...ACCOUNT,
      id: 'second',
      accessToken: 'second-key',
      externalAccountId: fingerprintApiKey('second-key'),
    };
    listConnections.mockResolvedValue([ACCOUNT, second]);
    values.set(ACCOUNT_CONNECTION_KEY, second.id);
    values.set(getRegistrationKey('workspace-1'), {
      apiKeyFingerprint: ACCOUNT.externalAccountId,
    });
    values.set(getRegistrationKey('workspace-2'), {
      apiKeyFingerprint: second.externalAccountId,
    });
    expect(await getApiKey('workspace-1')).toBe('native-key');
    expect(await getApiKey('workspace-2')).toBe('second-key');
    listConnections.mockResolvedValue([second]);
    await expect(getApiKey('workspace-1')).rejects.toThrow(
      'assigned to this workspace',
    );
    expect(await getApiKey('workspace-2')).toBe('second-key');
  });

  it('uses the workspace key for provider requests and native email channels', async () => {
    const second = {
      ...ACCOUNT,
      id: 'second',
      accessToken: 'second-key',
      externalAccountId: fingerprintApiKey('second-key'),
    };
    listConnections.mockResolvedValue([ACCOUNT, second]);
    values.set(ACCOUNT_CONNECTION_KEY, second.id);
    values.set(getRegistrationKey('workspace-1'), {
      apiKeyFingerprint: ACCOUNT.externalAccountId,
    });
    values.set(getRegistrationKey('workspace-2'), {
      apiKeyFingerprint: second.externalAccountId,
    });
    await plusvibeRequest('/lead/workspace-leads', z.unknown(), {
      query: { workspace_id: 'workspace-1' },
    });
    expect(fetchRequest).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'native-key' }),
      }),
    );
    expect((await findMailConnection('workspace-1'))?.id).toBe(ACCOUNT.id);
    expect((await findMailConnection('workspace-2'))?.id).toBe(second.id);
  });

  it('adding another connection resumes only workspaces owned by that key', async () => {
    values.set(ACCOUNT_CONNECTION_KEY, 'original');
    values.set(SELECTION_KEY, ['workspace-1', 'workspace-2']);
    values.set(getRegistrationKey('workspace-1'), {
      apiKeyFingerprint: ACCOUNT.externalAccountId,
    });
    values.set(getRegistrationKey('workspace-2'), {
      apiKeyFingerprint: 'other',
    });
    await connectionOnConnectHandler({
      connectionProviderName: 'plusvibe',
      connectedAccountId: ACCOUNT.id,
    });
    expect(values.get(ACCOUNT_CONNECTION_KEY)).toBe('original');
    expect(startImport).toHaveBeenCalledExactlyOnceWith('workspace-1', true);
  });

  it('connecting never selects workspaces or starts an import on its own', async () => {
    await connectionOnConnectHandler({
      connectionProviderName: 'plusvibe',
      connectedAccountId: ACCOUNT.id,
    });
    expect(values.get(ACCOUNT_CONNECTION_KEY)).toBe(ACCOUNT.id);
    expect(values.has(SELECTION_KEY)).toBe(false);
    expect(startImport).not.toHaveBeenCalled();
  });

  it('keeps legacy message channels when the same key is moved to the native connection', async () => {
    const legacy = {
      ...ACCOUNT,
      id: 'legacy-mail',
      providerName: 'plusvibe-mail',
      providerType: 'custom',
      accessToken: null,
    };
    listConnections.mockImplementation(
      async (filter: { providerName?: string }) =>
        filter.providerName ? [ACCOUNT] : [ACCOUNT, legacy],
    );
    expect((await findMailConnection())?.id).toBe('legacy-mail');
  });
});
