import { afterEach, describe, expect, it, vi } from 'vitest';
import { slackRequest, slackIdentity } from 'src/utils/slack';

afterEach(() => vi.unstubAllGlobals());
describe('Slack API client', () => {
  it('preserves fractional timestamps as message identities', () =>
    expect(slackIdentity('T1', 'C1', '123.000001')).toBe('T1:C1:123.000001'));
  it('uses retry-after instead of dropping a throttled request', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('', { status: 429, headers: { 'retry-after': '23' } }),
        ),
    );
    await expect(
      slackRequest('secret', 'conversations.history'),
    ).rejects.toMatchObject({ delayMs: 23000 });
  });
  it('does not expose token or provider response on an API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ok: false,
          error: 'invalid_auth',
          access_token: 'secret',
        }),
      ),
    );
    await expect(slackRequest('secret', 'auth.test')).rejects.toThrow(
      'Slack invalid_auth',
    );
  });
});
