import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callback } from 'src/logic-functions/callback';
import { authorize } from 'src/logic-functions/authorize';
import { type ConnectionCallbackPayload } from 'twenty-sdk/logic-function';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({ kv: mocks }));
vi.mock('src/utils/slack', () => ({ variable: () => 'test-value' }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue({
    redirectUri: 'https://crm.example/auth/apps/custom/callback',
    createdAt: Date.now(),
  });
});
afterEach(() => vi.unstubAllGlobals());
const input = {
  queryStringParameters: { code: 'code' },
  connectionProviderId: 'provider',
  connectionProviderName: 'slack-sync',
  httpMethod: 'GET',
  headers: {},
  body: null,
  rawBody: null,
} satisfies ConnectionCallbackPayload;
describe('Slack user OAuth', () => {
  it('preserves the redirect URI across overlapping core-validated callbacks', async () => {
    const saved = new Map<string, { redirectUri: string; createdAt: number }>();
    mocks.set.mockImplementation((key, value) => saved.set(key, value));
    mocks.get.mockImplementation((key) => saved.get(key));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () =>
        Response.json({
          ok: true,
          team: { id: 'T1' },
          authed_user: {
            id: 'U1',
            token_type: 'user',
            access_token: 'user-token',
          },
        }),
      ),
    );
    for (const state of ['first-state', 'second-state']) {
      const result = await authorize({
        connectionProviderId: input.connectionProviderId,
        connectionProviderName: input.connectionProviderName,
        callbackUrl: `https://crm.example/auth/apps/custom/callback?state=${state}`,
      });
      const url = new URL(result.authorizationUrl);
      expect(url.searchParams.get('state')).toBe(state);
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://crm.example/auth/apps/custom/callback',
      );
    }
    await callback(input);
    await callback({
      ...input,
      queryStringParameters: { code: 'second-code' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(saved.size).toBe(1);
  });
  it('exchanges the code after Twenty consumes state and persists the user token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ok: true,
          access_token: 'bot-token',
          team: { id: 'T1' },
          authed_user: {
            id: 'U1',
            token_type: 'user',
            access_token: 'user-token',
          },
        }),
      ),
    );
    await expect(callback(input)).resolves.toEqual({
      externalAccountId: 'T1:U1',
      handle: 'T1:U1',
      accessToken: 'user-token',
    });
    expect(mocks.get).toHaveBeenCalledWith('oauth:redirect-uri:provider');
    expect(mocks.delete).not.toHaveBeenCalled();
    const request = vi.mocked(fetch).mock.calls[0][1];
    expect(
      new URLSearchParams(request?.body as URLSearchParams).get('redirect_uri'),
    ).toBe('https://crm.example/auth/apps/custom/callback');
  });
  it('refuses an expired authorization before exchanging credentials', async () => {
    mocks.get.mockResolvedValue({ createdAt: Date.now() - 16 * 60000 });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(callback(input)).rejects.toThrow('expired');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects bot-only authorizations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ok: true,
          team: { id: 'T' },
          access_token: 'bot-token',
        }),
      ),
    );
    await expect(callback(input)).rejects.toThrow('user token');
  });
  it('rejects a provider denial before exchanging credentials', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      callback({ ...input, queryStringParameters: { error: 'access_denied' } }),
    ).rejects.toThrow('not completed');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
