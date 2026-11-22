import { describe, it, expect, vi } from 'vitest';
import { TwitterClient } from 'src/logic-functions/utils/twitter-client';
import { resolveTwitterProfileInput } from 'src/logic-functions/utils/resolve-twitter-profile-input.util';
import { collectOriginalPosts } from 'src/logic-functions/utils/collect-original-posts.util';
import { TWITTER_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/twitter-analytics-sync-options.constant';

const profile = {
  recordId: 'record',
  userId: '123',
  handle: 'acme',
  title: 'Acme',
  avatarUrl: null,
  followerCount: 100,
  followingCount: 10,
};
const credentials = [{ id: 'connection-1', apiKey: 'private-test-key' }];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const post = {
  id: 'post',
  createdAt: '2026-11-20T12:00:00Z',
  viewCount: 100,
  likeCount: 5,
  replyCount: 2,
  retweetCount: 3,
  quoteCount: 1,
};

describe('TwitterAPI.io', () => {
  it('resolves X and Twitter URLs and rejects other hosts and reserved routes', () => {
    for (const url of ['https://x.com/acme', 'https://twitter.com/acme?x=1'])
      expect(
        resolveTwitterProfileInput({
          recordId: '1',
          twitterId: null,
          twitterHandle: null,
          twitterUrl: url,
        })?.value,
      ).toBe('acme');
    for (const url of [
      'https://example.com/acme',
      'https://x.com/home',
      'broken',
    ])
      expect(
        resolveTwitterProfileInput({
          recordId: '1',
          twitterId: null,
          twitterHandle: null,
          twitterUrl: url,
        }),
      ).toBeNull();
  });
  it('uses the API key header and real user endpoint', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      json({
        status: 'success',
        data: { id: '123', userName: 'acme', followers: 100 },
      }),
    );
    const client = new TwitterClient({ credentials, fetchImplementation });
    const result = await client.resolveProfiles([
      {
        recordId: '1',
        twitterId: null,
        twitterHandle: '@acme',
        twitterUrl: null,
      },
    ]);
    expect(result.profiles[0]?.followerCount).toBe(100);
    expect(String(fetchImplementation.mock.calls[0][0])).toBe(
      'https://api.twitterapi.io/twitter/user/info?userName=acme',
    );
    expect(fetchImplementation.mock.calls[0][1].headers).toEqual({
      'X-API-Key': 'private-test-key',
    });
  });
  it('treats suspended profiles as unavailable', async () => {
    const client = new TwitterClient({
      credentials,
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(
          json({ status: 'success', data: { unavailable: true } }),
        ),
    });
    const result = await client.resolveProfiles([
      {
        recordId: '1',
        twitterId: null,
        twitterHandle: 'acme',
        twitterUrl: null,
      },
    ]);
    expect(result.notFound).toEqual(['1']);
  });
  it('filters replies and reposts while retaining quote engagement', async () => {
    const client = new TwitterClient({
      credentials,
      fetchImplementation: vi.fn().mockResolvedValue(
        json({
          data: {
            tweets: [
              post,
              { ...post, id: 'reply', isReply: true },
              { ...post, id: 'repost', isRetweet: true },
            ],
          },
          has_next_page: false,
        }),
      ),
    });
    expect((await client.listPostPage(profile)).posts).toEqual([
      expect.objectContaining({
        postId: 'post',
        views: 100,
        reposts: 3,
        quotes: 1,
      }),
    ]);
  });
  it('fails incomplete view data instead of publishing zero', async () => {
    const client = new TwitterClient({
      credentials,
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(
          json({ data: { tweets: [{ ...post, viewCount: undefined }] } }),
        ),
    });
    await expect(client.listPostPage(profile)).rejects.toThrow(
      'public view counts',
    );
  });
  it('retries transient failures on the same key and honors Retry-After', async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'Retry-After': '12' } }),
      )
      .mockResolvedValueOnce(json({ data: { tweets: [] } }));
    const waitImplementation = vi.fn().mockResolvedValue(undefined);
    const client = new TwitterClient({
      credentials,
      fetchImplementation,
      waitImplementation,
    });
    await client.listPostPage(profile);
    expect(waitImplementation).toHaveBeenCalledWith(12000);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });
  it('skips an exhausted connection without exposing its key', async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(json({}, 402))
      .mockResolvedValueOnce(json({ data: { tweets: [] } }));
    const client = new TwitterClient({
      credentials: [
        ...credentials,
        { id: 'connection-2', apiKey: 'another-key' },
      ],
      fetchImplementation,
    });
    await client.listPostPage(profile);
    expect(client.unavailableCredentialIds).toEqual(['connection-1']);
  });
  it('paces consecutive requests for free-tier connections', async () => {
    const waitImplementation = vi.fn().mockResolvedValue(undefined);
    const client = new TwitterClient({
      credentials,
      waitImplementation,
      fetchImplementation: vi
        .fn()
        .mockImplementation(async () => json({ data: { tweets: [] } })),
    });
    await client.listPostPage(profile);
    await client.listPostPage(profile);
    expect(waitImplementation).toHaveBeenCalledOnce();
    expect(waitImplementation.mock.calls[0]?.[0]).toBeGreaterThan(5000);
  });
  it('deduplicates paginated posts and refuses repeated cursors', async () => {
    const client = new TwitterClient({
      credentials,
      waitImplementation: vi.fn().mockResolvedValue(undefined),
      fetchImplementation: vi.fn().mockImplementation(async () =>
        json({
          data: { tweets: [post] },
          has_next_page: true,
          next_cursor: 'same',
        }),
      ),
    });
    await expect(
      collectOriginalPosts({
        twitterClient: client,
        profile: profile,
        asOf: '2026-11-22T12:00:00Z',
        options: TWITTER_ANALYTICS_SYNC_OPTIONS,
      }),
    ).rejects.toThrow('cursor repeated');
  });
});
