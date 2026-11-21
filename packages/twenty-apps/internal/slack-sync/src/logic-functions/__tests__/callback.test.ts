import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callback } from 'src/logic-functions/callback';
import { type ConnectionCallbackPayload } from 'twenty-sdk/logic-function';
const mocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
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
  queryStringParameters: { code: 'code', state: 'signed-state' },
  connectionProviderId: 'provider',
  connectionProviderName: 'slack-sync',
  httpMethod: 'GET',
  headers: {},
  body: null,
  rawBody: null,
} satisfies ConnectionCallbackPayload;
describe('Slack user OAuth', () => {
  it('persists the authorizing user token rather than the bot token', async () => {
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
    expect(mocks.delete).toHaveBeenCalled();
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
});
