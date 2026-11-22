import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGithubCredentials } from 'src/logic-functions/utils/github-credentials';
const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({
  listConnections: (options: unknown) => mocks.list(options),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GITHUB_TOKEN', '');
  delete process.env.SYNC_SETTINGS;
});
afterEach(() => vi.unstubAllEnvs());
describe('native GitHub connections', () => {
  it('prefers OAuth connections and deduplicates their tokens across providers', async () => {
    mocks.list.mockImplementation(
      async ({ providerName }: { providerName: string }) =>
        providerName === 'github-oauth'
          ? [
              {
                id: 'oauth-account',
                providerType: 'oauth',
                accessToken: 'oauth-token',
              },
            ]
          : [
              {
                id: 'duplicate',
                providerType: 'api-key',
                accessToken: 'oauth-token',
              },
              {
                id: 'fallback',
                providerType: 'api-key',
                accessToken: 'pat-token',
              },
            ],
    );
    expect(await getGithubCredentials()).toEqual([
      { id: 'oauth-account', token: 'oauth-token' },
      { id: 'fallback', token: 'pat-token' },
    ]);
  });
  it('does not use anonymous access when an OAuth connection needs reconnecting', async () => {
    mocks.list.mockImplementation(
      async ({ providerName }: { providerName: string }) =>
        providerName === 'github-oauth'
          ? [
              {
                id: 'failed',
                providerType: 'oauth',
                accessToken: 'old',
                authFailedAt: '2026-11-22',
              },
            ]
          : [],
    );
    await expect(getGithubCredentials()).rejects.toThrow(
      'Connect GitHub OAuth',
    );
  });

  it('deduplicates keys and excludes failed or empty connections', async () => {
    mocks.list.mockResolvedValue([
      { id: 'one', providerType: 'api-key', accessToken: ' key ' },
      { id: 'duplicate', providerType: 'api-key', accessToken: 'key' },
      {
        id: 'failed',
        providerType: 'api-key',
        accessToken: 'bad',
        authFailedAt: '2026-11-22',
      },
      { id: 'empty', providerType: 'api-key', accessToken: '  ' },
    ]);
    expect(await getGithubCredentials()).toEqual([{ id: 'one', token: 'key' }]);
  });
  it('keeps legacy token support without duplicating a configured key', async () => {
    mocks.list.mockResolvedValue([
      { id: 'one', providerType: 'api-key', accessToken: 'key' },
    ]);
    vi.stubEnv('GITHUB_TOKEN', 'key');
    expect(await getGithubCredentials()).toHaveLength(1);
  });
  it('allows explicitly configured anonymous access only when there are no keys are configured', async () => {
    mocks.list.mockResolvedValue([]);
    expect(await getGithubCredentials()).toEqual([
      { id: 'anonymous', token: null, ownerId: 'anonymous' },
    ]);
    vi.stubEnv('SYNC_SETTINGS', JSON.stringify({ allowAnonymous: false }));
    await expect(getGithubCredentials()).rejects.toThrow(
      'Connect GitHub OAuth',
    );
  });
  it('does not silently fall back to anonymous access when configured keys are failed', async () => {
    mocks.list.mockResolvedValue([
      {
        id: 'failed',
        providerType: 'api-key',
        accessToken: 'bad',
        authFailedAt: '2026-11-22',
      },
    ]);
    await expect(getGithubCredentials()).rejects.toThrow(
      'Connect GitHub OAuth',
    );
  });
});
