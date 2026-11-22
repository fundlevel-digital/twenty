import { afterEach, describe, expect, it, vi } from 'vitest';
import { type AppConnection, listConnections } from 'twenty-sdk/logic-function';

import { getTwitterCredentials } from 'src/logic-functions/utils/get-twitter-credentials.util';

vi.mock('twenty-sdk/logic-function', () => ({ listConnections: vi.fn() }));

const buildConnection = (
  id: string,
  accessToken: string,
): Extract<AppConnection, { providerType: 'api-key' }> => ({
  id,
  providerName: 'twitter',
  name: `Twitter API keys ${id}`,
  handle: 'owner@example.com',
  externalAccountId: null,
  scope: 'WORKSPACE',
  visibility: 'workspace',
  userWorkspaceId: 'user-1',
  workspaceMemberId: null,
  providerType: 'api-key',
  accessToken,
  scopes: [],
  authFailedAt: null,
  authFailedReason: null,
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('getTwitterCredentials', () => {
  it('loads separate workspace API key connections', async () => {
    vi.mocked(listConnections).mockResolvedValue([
      buildConnection('first', ' key-a '),
      buildConnection('second', 'key-b'),
    ]);
    expect(await getTwitterCredentials()).toEqual([
      { id: 'api-key-first', apiKey: 'key-a' },
      { id: 'api-key-second', apiKey: 'key-b' },
    ]);
    expect(listConnections).toHaveBeenCalledWith({
      providerName: 'twitter',
      scope: 'WORKSPACE',
    });
  });

  it('deduplicates keys while retaining the first connection identifier', async () => {
    vi.mocked(listConnections).mockResolvedValue([
      buildConnection('first', 'key-a'),
      buildConnection('duplicate', ' key-a '),
    ]);
    expect(await getTwitterCredentials()).toEqual([
      { id: 'api-key-first', apiKey: 'key-a' },
    ]);
  });

  it('ignores failed, empty and OAuth connections', async () => {
    vi.mocked(listConnections).mockResolvedValue([
      { ...buildConnection('failed', 'key-a'), authFailedAt: '2026-11-21' },
      buildConnection('empty', '  '),
      { ...buildConnection('oauth', 'token'), providerType: 'oauth' },
      buildConnection('healthy', 'key-b'),
    ]);
    expect(await getTwitterCredentials()).toEqual([
      { id: 'api-key-healthy', apiKey: 'key-b' },
    ]);
  });

  it.each([
    { connections: [] },
    { connections: [buildConnection('empty', ' ')] },
  ])(
    'fails clearly when no usable keys are connected',
    async ({ connections }) => {
      vi.mocked(listConnections).mockResolvedValue(connections);
      await expect(getTwitterCredentials()).rejects.toThrow(
        'No usable Twitter API key connections',
      );
    },
  );

  it('does not expose secrets from connection-service failures', async () => {
    vi.mocked(listConnections).mockRejectedValue(
      new Error('private-key-value'),
    );
    await expect(getTwitterCredentials()).rejects.toThrow(
      'Could not load Twitter API key connections. Check the app connection settings.',
    );
  });
});
