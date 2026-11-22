import { describe, expect, it, vi } from 'vitest';
import {
  GithubClient,
  GithubRateLimitError,
  type GithubStateStore,
} from 'src/logic-functions/utils/github-client';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const store = (): GithubStateStore => {
  const values = new Map<string, unknown>();
  return {
    get: async <TValue>(key: string) =>
      (values.get(key) ?? null) as TValue | null,
    set: async (key, value) => {
      values.set(key, value);
    },
  };
};
const credentials = [
  { id: 'first', token: 'token-one', ownerId: 'account-one' },
  { id: 'same-owner', token: 'token-two', ownerId: 'account-one' },
  { id: 'other-owner', token: 'token-three', ownerId: 'account-two' },
];
const success = () => new Response(JSON.stringify({ login: 'demo' }));

describe('GitHub authentication waterfall', () => {
  it('keeps exhausted search quota separate from core requests', async () => {
    const state = store();
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String((NOW + 60000) / 1000),
          },
        }),
      )
      .mockResolvedValueOnce(success());
    const options = {
      credentials: credentials.slice(0, 1),
      store: state,
      fetchImplementation,
      now: () => NOW,
    };
    await expect(
      new GithubClient(options).request('/search/commits?q=author%3Ademo'),
    ).rejects.toBeInstanceOf(GithubRateLimitError);
    await expect(
      new GithubClient(options).request('/users/demo'),
    ).resolves.toBeDefined();
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });
  it('does not use an exhausted core quota to block a known account search quota', async () => {
    const state = store();
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String((NOW + 3600000) / 1000),
          },
        }),
      )
      .mockResolvedValueOnce(success());
    const options = {
      credentials: credentials.slice(0, 1),
      store: state,
      fetchImplementation,
      now: () => NOW,
    };
    await expect(
      new GithubClient(options).request('/users/demo'),
    ).rejects.toBeInstanceOf(GithubRateLimitError);
    await expect(
      new GithubClient(options).request('/search/commits?q=author%3Ademo'),
    ).resolves.toBeDefined();
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it('falls through invalid keys without logging tokens', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(success());
    const client = new GithubClient({
      credentials: credentials.slice(0, 2),
      store: store(),
      fetchImplementation: fetch,
      now: () => NOW,
    });
    await expect(client.request('/users/demo')).resolves.toMatchObject({
      body: { login: 'demo' },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer token-two',
    );
  });
  it('skips all keys sharing an exhausted account and persists the reset', async () => {
    const state = store();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String((NOW + 3600000) / 1000),
          },
        }),
      )
      .mockResolvedValueOnce(success());
    await new GithubClient({
      credentials,
      store: state,
      fetchImplementation: fetch,
      now: () => NOW,
    }).request('/users/demo');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer token-three',
    );
    const nextFetch = vi.fn().mockResolvedValue(success());
    await new GithubClient({
      credentials,
      store: state,
      fetchImplementation: nextFetch,
      now: () => NOW,
    }).request('/users/another');
    expect(nextFetch).toHaveBeenCalledTimes(1);
    expect(nextFetch.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer token-three',
    );
  });
  it('preserves the last successful response while marking its account exhausted', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"login":"demo"}', {
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String((NOW + 3600000) / 1000),
          },
        }),
      )
      .mockResolvedValueOnce(success());
    const client = new GithubClient({
      credentials,
      store: store(),
      fetchImplementation: fetch,
      now: () => NOW,
    });
    expect((await client.request('/users/demo')).body).toEqual({
      login: 'demo',
    });
    await client.request('/users/another');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer token-three',
    );
  });
  it('honors secondary Retry-After without rotating to another key', async () => {
    const state = store();
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('', { status: 429, headers: { 'retry-after': '120' } }),
      );
    const client = new GithubClient({
      credentials,
      store: state,
      fetchImplementation: fetch,
      now: () => NOW,
    });
    await expect(client.request('/users/demo')).rejects.toMatchObject({
      kind: 'secondary',
      retryAt: NOW + 121000,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const blockedFetch = vi.fn();
    await expect(
      new GithubClient({
        credentials,
        store: state,
        fetchImplementation: blockedFetch,
        now: () => NOW + 10000,
      }).request('/users/demo'),
    ).rejects.toBeInstanceOf(GithubRateLimitError);
    expect(blockedFetch).not.toHaveBeenCalled();
  });
  it('retries transient network and server failures with bounded backoff', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValueOnce(success());
    const wait = vi.fn(async () => undefined);
    await new GithubClient({
      credentials: [credentials[0]],
      store: store(),
      fetchImplementation: fetch,
      wait,
    }).request('/users/demo');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[1000], [2000]]);
  });
  it('validates each token owner once and caches the identity', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"id":42}'))
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(success());
    const state = store();
    await new GithubClient({
      credentials: [{ id: 'key', token: 'test-key' }],
      store: state,
      fetchImplementation: fetch,
    }).request('/users/demo');
    await new GithubClient({
      credentials: [{ id: 'key', token: 'test-key' }],
      store: state,
      fetchImplementation: fetch,
    }).request('/users/another');
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      'https://api.github.com/user',
      'https://api.github.com/users/demo',
      'https://api.github.com/users/another',
    ]);
  });
  it('honors Retry-After even when a primary exhaustion header is also present', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response('', {
        status: 403,
        headers: {
          'retry-after': '120',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String((NOW + 60000) / 1000),
        },
      }),
    );
    await expect(
      new GithubClient({
        credentials,
        store: store(),
        fetchImplementation: fetch,
        now: () => NOW,
      }).request('/users/demo'),
    ).rejects.toMatchObject({ kind: 'secondary', retryAt: NOW + 121000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
