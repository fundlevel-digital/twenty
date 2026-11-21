import { afterEach, describe, expect, it, vi } from 'vitest';

import { YoutubeClient } from 'src/logic-functions/utils/youtube-client';

const CHANNEL_ID = 'UC0000000000000000000000';

const channelsResponse = () =>
  Response.json({
    items: [
      {
        id: CHANNEL_ID,
        contentDetails: { relatedPlaylists: { uploads: 'UU000' } },
        statistics: { subscriberCount: '1000' },
      },
    ],
  });

const quotaExceededResponse = (reason: string) =>
  Response.json({ error: { errors: [{ reason }] } }, { status: 403 });

type RecordedRequest = { url: URL; authorization: string | null };

const recordRequest = (
  requests: RecordedRequest[],
  input: string | URL | Request,
  init?: RequestInit,
): URL => {
  const url = new URL(String(input));

  requests.push({
    url,
    authorization: new Headers(init?.headers).get('Authorization'),
  });

  return url;
};

const buildClient = (
  fetchImplementation: typeof fetch,
  apiKeys = ['key-a', 'key-b'],
  waitImplementation: (milliseconds: number) => Promise<void> = async () => {},
) =>
  new YoutubeClient({
    credentials: apiKeys.map((apiKey, index) => ({
      id: `api-key-${index + 1}`,
      apiKey,
    })),
    fetchImplementation,
    waitImplementation,
  });

describe('YoutubeClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the channels, playlistItems and videos endpoints directly through Google', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImplementation = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = recordRequest(requests, input, init);

      if (url.pathname.endsWith('/channels')) {
        return channelsResponse();
      }

      if (url.pathname.endsWith('/playlistItems')) {
        return Response.json({
          items: [
            {
              contentDetails: {
                videoId: 'video-1',
                videoPublishedAt: '2026-08-01T00:00:00Z',
              },
            },
          ],
        });
      }

      return Response.json({
        items: [
          {
            id: 'video-1',
            snippet: {
              publishedAt: '2026-08-01T00:00:00Z',
              liveBroadcastContent: 'none',
            },
            statistics: { viewCount: '100', likeCount: '5', commentCount: '1' },
            contentDetails: { duration: 'PT10M' },
          },
        ],
      });
    }) as typeof fetch;
    const client = buildClient(fetchImplementation, ['key-a']);

    const resolved = await client.resolveChannels([
      {
        recordId: 'channel-record-1',
        youtubeId: CHANNEL_ID,
        youtubeHandle: null,
        youtubeUrl: null,
      },
    ]);
    const channel = resolved.channels[0];

    if (channel === undefined) {
      throw new Error('Expected the channel to resolve');
    }

    const page = await client.listUploadPage({
      uploadsPlaylistId: channel.uploadsPlaylistId,
      asOf: '2026-08-28T23:59:59.999Z',
    });
    const videos = await client.getVideos(
      page.candidates.map((candidate) => candidate.videoId),
    );

    expect(requests.map(({ url }) => `${url.host}${url.pathname}`)).toEqual([
      'www.googleapis.com/youtube/v3/channels',
      'www.googleapis.com/youtube/v3/playlistItems',
      'www.googleapis.com/youtube/v3/videos',
    ]);
    expect(requests.every(({ authorization }) => authorization === null)).toBe(
      true,
    );
    expect(
      requests.every(({ url }) => url.searchParams.get('key') === 'key-a'),
    ).toBe(true);
    expect(videos.get('video-1')?.durationSeconds).toBe(600);
    expect(client.quotaUsage).toEqual({
      channelsList: 1,
      playlistItemsList: 1,
      videosList: 1,
    });
  });

  it.each([true, false])(
    'preserves public identity and respects hidden subscribers (%s)',
    async (hiddenSubscriberCount) => {
      const client = buildClient((async () =>
        Response.json({
          items: [
            {
              id: CHANNEL_ID,
              snippet: { title: 'Creator', customUrl: '@creator' },
              contentDetails: { relatedPlaylists: { uploads: 'UU000' } },
              statistics: { subscriberCount: '1000', hiddenSubscriberCount },
            },
          ],
        })) as typeof fetch);
      const result = await client.resolveChannels([
        {
          recordId: 'channel-record-1',
          youtubeId: CHANNEL_ID,
          youtubeHandle: null,
          youtubeUrl: null,
        },
      ]);
      expect(result.channels[0]).toMatchObject({
        title: 'Creator',
        handle: '@creator',
        subscriberCount: hiddenSubscriberCount ? null : 1000,
      });
    },
  );

  it('moves to the next key after an authorization failure', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImplementation = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      recordRequest(requests, input, init);

      return new URL(String(input)).searchParams.get('key') === 'key-a'
        ? new Response(null, { status: 401 })
        : channelsResponse();
    }) as typeof fetch;
    const client = buildClient(fetchImplementation);
    const identity = {
      recordId: 'channel-record-1',
      youtubeId: CHANNEL_ID,
      youtubeHandle: null,
      youtubeUrl: null,
    };

    await client.resolveChannels([identity]);
    const second = await client.resolveChannels([identity]);

    expect(second.channels).toHaveLength(1);
    expect(requests.map(({ url }) => url.searchParams.get('key'))).toEqual([
      'key-a',
      'key-b',
      'key-b',
    ]);
    expect(client.unavailableCredentialIds).toEqual(['api-key-1']);
    expect(client.quotaUsage.channelsList).toBe(3);
  });

  it('fails the channel with a clear error once all keys are exhausted', async () => {
    let calls = 0;
    const fetchImplementation = (async () => {
      calls++;

      return quotaExceededResponse(
        calls === 1 ? 'dailyLimitExceeded' : 'quotaExceeded',
      );
    }) as unknown as typeof fetch;
    const client = buildClient(fetchImplementation);

    const resolved = await client.resolveChannels([
      {
        recordId: 'channel-record-1',
        youtubeId: CHANNEL_ID,
        youtubeHandle: null,
        youtubeUrl: null,
      },
      {
        recordId: 'channel-record-2',
        youtubeId: null,
        youtubeHandle: '@creator',
        youtubeUrl: null,
      },
    ]);

    expect(calls).toBe(2);
    expect(resolved.channels).toEqual([]);
    expect(resolved.failed.map(({ recordId }) => recordId)).toEqual([
      'channel-record-1',
      'channel-record-2',
    ]);
    expect(resolved.failed[1]?.reason).toContain(
      'No usable YouTube credentials remain',
    );
  });

  it('retries a transient server error on the same key', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImplementation = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      recordRequest(requests, input, init);

      return requests.length === 1
        ? new Response(null, { status: 503 })
        : channelsResponse();
    }) as typeof fetch;
    const client = buildClient(fetchImplementation);

    const resolved = await client.resolveChannels([
      {
        recordId: 'channel-record-1',
        youtubeId: CHANNEL_ID,
        youtubeHandle: null,
        youtubeUrl: null,
      },
    ]);

    expect(resolved.channels).toHaveLength(1);
    expect(requests.map(({ url }) => url.searchParams.get('key'))).toEqual([
      'key-a',
      'key-a',
    ]);
    expect(client.unavailableCredentialIds).toEqual([]);
  });

  it.each([
    ['12', 12_000],
    ['Fri, 20 Nov 2026 05:00:20 GMT', 20_000],
    ['invalid', 4_000],
    ['-1', 4_000],
    ['1', 4_000],
  ])('honors Retry-After %s', async (retryAfter, expectedDelay) => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T05:00:00Z'));
    const delays: number[] = [];
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }),
      )
      .mockResolvedValueOnce(channelsResponse());
    const client = buildClient(
      fetchImplementation,
      ['secret-key'],
      async (delay) => {
        delays.push(delay);
      },
    );
    await client.getVideos(['video-1']);
    expect(delays).toEqual([expectedDelay]);
    expect(client.unavailableCredentialIds).toEqual([]);
  });

  it('distributes new requests across healthy credentials', async () => {
    const requests: RecordedRequest[] = [];
    const client = buildClient((async (input, options) => {
      recordRequest(requests, input, options);
      return Response.json({ items: [] });
    }) as typeof fetch);
    await Promise.all([
      client.getVideos(['one']),
      client.getVideos(['two']),
      client.getVideos(['three']),
    ]);
    expect(requests.map(({ url }) => url.searchParams.get('key'))).toEqual([
      'key-a',
      'key-b',
      'key-a',
    ]);
  });

  it('bounds transient retries and keeps secrets out of errors', async () => {
    const delays: number[] = [];
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('URL contains secret-token'));
    const client = buildClient(
      fetchImplementation,
      ['secret-key'],
      async (delay) => {
        delays.push(delay);
      },
    );
    await expect(client.getVideos(['video-1'])).rejects.toThrow(
      'network request failed (credential: api-key-1)',
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    expect(delays).toEqual([4000, 8000, 16000]);
  });

  it('retries Google rate limits without exhausting credentials', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(quotaExceededResponse('rateLimitExceeded'))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    const client = buildClient(fetchImplementation);
    await client.getVideos(['video-1']);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(client.unavailableCredentialIds).toEqual([]);
  });

  it('sends the API key only to Google without OAuth headers', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ items: [] }));
    const client = buildClient(fetchImplementation, ['secret-key']);
    await client.getVideos(['video-1']);
    const [url, options] = fetchImplementation.mock.calls[0];
    expect(new URL(String(url)).origin).toBe('https://www.googleapis.com');
    expect(new URL(String(url)).searchParams.get('key')).toBe('secret-key');
    expect(new Headers(options?.headers).get('Authorization')).toBeNull();
    expect(new Headers(options?.headers).get('X-Treg-Token')).toBeNull();
  });

  it('keeps other keys available after one exceeds its quota', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(quotaExceededResponse('quotaExceeded'))
      .mockImplementation(async () => Response.json({ items: [] }));
    const client = buildClient(fetchImplementation);
    await client.getVideos(['video-1']);
    await client.getVideos(['video-2']);
    expect(client.unavailableCredentialIds).toEqual(['api-key-1']);
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(
      fetchImplementation.mock.calls.map(([url]) =>
        new URL(String(url)).searchParams.get('key'),
      ),
    ).toEqual(['key-a', 'key-b', 'key-b']);
  });

  it.each([
    { status: 400, error: { errors: [{ reason: 'keyInvalid' }] } },
    {
      status: 400,
      error: {
        errors: [{ reason: 'badRequest' }],
        details: [{ reason: 'API_KEY_INVALID' }],
      },
    },
    { status: 403, error: { errors: [{ reason: 'accessNotConfigured' }] } },
  ])(
    'skips unusable keys after Google returns $status',
    async ({ status, error }) => {
      const fetchImplementation = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ error }, { status }))
        .mockImplementation(async () => Response.json({ items: [] }));
      const client = buildClient(fetchImplementation);
      await client.getVideos(['video-1']);
      expect(client.unavailableCredentialIds).toEqual(['api-key-1']);
      expect(fetchImplementation).toHaveBeenCalledTimes(2);
    },
  );

  it('moves past a rejected key without disabling other keys', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    const client = new YoutubeClient({
      credentials: [
        { id: 'api-key-1', apiKey: 'key-1' },
        { id: 'api-key-2', apiKey: 'key-2' },
      ],
      fetchImplementation,
    });
    await client.getVideos(['video-1']);
    expect(client.unavailableCredentialIds).toEqual(['api-key-1']);
  });

  it('handles a non-JSON terminal response without exposing credentials', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('error', { status: 403 }));
    const client = buildClient(fetchImplementation);
    await expect(client.getVideos(['video-1'])).rejects.toThrow(
      'YouTube videosList failed with status 403 (credential: api-key-1)',
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });
});
