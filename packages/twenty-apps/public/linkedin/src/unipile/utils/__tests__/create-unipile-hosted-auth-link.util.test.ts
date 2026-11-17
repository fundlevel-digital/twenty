import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createAuthLink: vi.fn() }));

vi.mock('@unipile/sdk', () => ({
  UnipileHostedAuth: class {
    createAuthLink = mocks.createAuthLink;
  },
}));

vi.mock('src/unipile/utils/get-unipile-request-options.util', () => ({
  getUnipileRequestOptions: () => ({ auth: 'key', throwOnError: true }),
}));

const { createUnipileHostedAuthLink } =
  await import('src/unipile/utils/create-unipile-hosted-auth-link.util');

describe('createUnipileHostedAuthLink', () => {
  it('lets the member set their own proxy or proxy country when signing in', async () => {
    mocks.createAuthLink.mockResolvedValue({
      data: { link: 'https://account.unipile.com/link' },
    });

    await expect(
      createUnipileHostedAuthLink({
        provider: 'linkedin',
        callbackUrl:
          'https://api.twenty.com/auth/apps/custom/callback?state=signed.state',
      }),
    ).resolves.toBe('https://account.unipile.com/link');

    expect(mocks.createAuthLink).toHaveBeenCalledExactlyOnceWith({
      auth: 'key',
      throwOnError: true,
      body: expect.objectContaining({
        providers: ['linkedin'],
        redirect_uri: 'https://api.twenty.com/auth/apps/custom/callback',
        state: 'signed.state',
        config: {
          global: {
            allow_user_proxy_override: true,
            allow_user_country_override: true,
          },
        },
      }),
    });
  });
});
