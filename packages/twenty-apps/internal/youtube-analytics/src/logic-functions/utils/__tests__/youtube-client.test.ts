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

type RecordedRequest = { url: URL; tregToken: string | null };

const recordRequest = (
  requests: RecordedRequest[],
  input: string | URL | Request,
  init?: RequestInit,
): URL => {
  const url = new URL(String(input));

  requests.push({
    url,
    tregToken: new Headers(init?.headers).get('X-Treg-Token'),
  });

  return url;
};

const buildClient = (
  fetchImplementation: typeof fetch,
  keyToolNames = ['key-a', 'key-b'],
  waitImplementation: (milliseconds: number) => Promise<void> = async () => {},
) =>
  new YoutubeClient({
    tregToken: 'treg-token',
    keyToolNames,
    fetchImplementation,
    waitImplementation,
  });

describe('YoutubeClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the channels, playlistItems and videos endpoints through treg', async () => {
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
    const client = buildClient(fetchImplementation);

    const resolved = await client.resolveChannels([
      {
        influencerId: 'influencer-1',
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
      'treg.to/call/key-a/youtube/v3/channels',
      'treg.to/call/key-a/youtube/v3/playlistItems',
      'treg.to/call/key-a/youtube/v3/videos',
    ]);
    expect(requests.every(({ tregToken }) => tregToken === 'treg-token')).toBe(
      true,
    );
    expect(requests.some(({ url }) => url.searchParams.has('key'))).toBe(false);
    expect(videos.get('video-1')?.durationSeconds).toBe(600);
    expect(client.quotaUsage).toEqual({
      channelsList: 1,
      playlistItemsList: 1,
      videosList: 1,
    });
  });

  it('moves to the next key tool on a quota error and keeps skipping the exhausted one', async () => {
    const requests: RecordedRequest[] = [];
    const fetchImplementation = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = recordRequest(requests, input, init);

      return url.pathname.startsWith('/call/key-a/')
        ? quotaExceededResponse('quotaExceeded')
        : channelsResponse();
    }) as typeof fetch;
    const client = buildClient(fetchImplementation);
    const identity = {
      influencerId: 'influencer-1',
      youtubeId: CHANNEL_ID,
      youtubeHandle: null,
      youtubeUrl: null,
    };

    await client.resolveChannels([identity]);
    const second = await client.resolveChannels([identity]);

    expect(second.channels).toHaveLength(1);
    expect(requests.map(({ url }) => url.pathname.split('/')[2])).toEqual([
      'key-a',
      'key-b',
      'key-b',
    ]);
    expect(client.exhaustedKeyToolNames).toEqual(['key-a']);
    expect(client.quotaUsage.channelsList).toBe(3);
  });

  it('fails the influencer with a clear error once every key tool is exhausted', async () => {
    let calls = 0;
    const fetchImplementation = (async () => {
      calls++;

      return quotaExceededResponse(
        calls === 1 ? 'dailyLimitExceeded' : 'rateLimitExceeded',
      );
    }) as unknown as typeof fetch;
    const client = buildClient(fetchImplementation);

    const resolved = await client.resolveChannels([
      {
        influencerId: 'influencer-1',
        youtubeId: CHANNEL_ID,
        youtubeHandle: null,
        youtubeUrl: null,
      },
      {
        influencerId: 'influencer-2',
        youtubeId: null,
        youtubeHandle: '@creator',
        youtubeUrl: null,
      },
    ]);

    expect(calls).toBe(2);
    expect(resolved.channels).toEqual([]);
    expect(resolved.failed.map(({ influencerId }) => influencerId)).toEqual([
      'influencer-1',
      'influencer-2',
    ]);
    expect(resolved.failed[1]?.reason).toContain(
      'Every treg YouTube key tool is out of quota (key-a, key-b)',
    );
  });

  it('retries a transient server error on the same key tool', async () => {
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
        influencerId: 'influencer-1',
        youtubeId: CHANNEL_ID,
        youtubeHandle: null,
        youtubeUrl: null,
      },
    ]);

    expect(resolved.channels).toHaveLength(1);
    expect(requests.map(({ url }) => url.pathname.split('/')[2])).toEqual([
      'key-a',
      'key-a',
    ]);
    expect(client.exhaustedKeyToolNames).toEqual([]);
  });

  it.each([
    { retryAfter: '12', retryAfterSeconds: undefined, expectedDelay: 12_000 },
    {
      retryAfter: 'Fri, 20 Nov 2026 05:00:20 GMT',
      retryAfterSeconds: undefined,
      expectedDelay: 20_000,
    },
    { retryAfter: undefined, retryAfterSeconds: 15, expectedDelay: 15_000 },
    { retryAfter: '12', retryAfterSeconds: 15, expectedDelay: 15_000 },
    {
      retryAfter: 'invalid',
      retryAfterSeconds: undefined,
      expectedDelay: 4_000,
    },
    { retryAfter: '-1', retryAfterSeconds: undefined, expectedDelay: 4_000 },
    { retryAfter: '1', retryAfterSeconds: undefined, expectedDelay: 4_000 },
  ])(
    'waits $expectedDelay ms before retrying a treg 429 with $retryAfter / $retryAfterSeconds',
    async ({ retryAfter, retryAfterSeconds, expectedDelay }) => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T05:00:00Z'));
      const requests: RecordedRequest[] = [];
      const delays: number[] = [];
      const fetchImplementation = (async (
        input: string | URL | Request,
        init?: RequestInit,
      ) => {
        recordRequest(requests, input, init);

        return requests.length === 1
          ? Response.json(
              {
                detail: {
                  error: 'org_rate_limit',
                  retry_after_s: retryAfterSeconds,
                },
              },
              {
                status: 429,
                headers: {
                  'X-Treg-Error': '1',
                  ...(retryAfter === undefined
                    ? {}
                    : { 'Retry-After': retryAfter }),
                },
              },
            )
          : Response.json({ items: [] });
      }) as typeof fetch;
      const client = buildClient(
        fetchImplementation,
        ['key-a', 'key-b'],
        async (delay) => {
          delays.push(delay);
        },
      );

      await client.listUploadPage({
        uploadsPlaylistId: 'UU000',
        asOf: '2026-11-20T05:00:00Z',
      });

      expect(delays).toEqual([expectedDelay]);
      expect(requests.map(({ url }) => url.pathname.split('/')[2])).toEqual([
        'key-a',
        'key-a',
      ]);
      expect(client.exhaustedKeyToolNames).toEqual([]);
    },
  );

  it('reports the treg reason and call id after bounded retries', async () => {
    const delays: number[] = [];
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json(
          { detail: { error: 'org_concurrency_limit' } },
          {
            status: 429,
            headers: { 'X-Treg-Error': '1', 'X-Treg-Call-Id': 'call-123' },
          },
        ),
      );
    const client = buildClient(
      fetchImplementation,
      ['key-a'],
      async (delay) => {
        delays.push(delay);
      },
    );

    await expect(
      client.listUploadPage({
        uploadsPlaylistId: 'UU000',
        asOf: '2026-11-20T05:00:00Z',
      }),
    ).rejects.toThrow(
      'YouTube playlistItemsList failed with status 429 (treg refusal; key tool: key-a; org_concurrency_limit; call: call-123)',
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    expect(delays).toEqual([4_000, 8_000, 16_000]);
    expect(client.exhaustedKeyToolNames).toEqual([]);
  });

  it.each(['member_spend_cap_reached', 'trial_allowance_reached'])(
    'fails without retrying a daily treg %s refusal',
    async (reason) => {
      const fetchImplementation = vi
        .fn<typeof fetch>()
        .mockImplementation(async () =>
          Response.json(
            { detail: { error: reason } },
            {
              status: 429,
              headers: { 'X-Treg-Error': '1', 'Retry-After': '86400' },
            },
          ),
        );
      const waitImplementation = vi.fn(async () => {});
      const client = buildClient(
        fetchImplementation,
        ['key-a', 'key-b'],
        waitImplementation,
      );

      await expect(
        client.listUploadPage({
          uploadsPlaylistId: 'UU000',
          asOf: '2026-11-20T05:00:00Z',
        }),
      ).rejects.toThrow(reason);
      expect(fetchImplementation).toHaveBeenCalledTimes(1);
      expect(waitImplementation).not.toHaveBeenCalled();
      expect(client.exhaustedKeyToolNames).toEqual([]);
    },
  );

  it('does not exhaust a YouTube key for a treg 403', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json(
          {
            error: { errors: [{ reason: 'quotaExceeded' }] },
            detail: 'tool_access_denied',
          },
          {
            status: 403,
            headers: { 'X-Treg-Error': '1' },
          },
        ),
      );
    const client = buildClient(fetchImplementation);

    await expect(
      client.listUploadPage({
        uploadsPlaylistId: 'UU000',
        asOf: '2026-11-20T05:00:00Z',
      }),
    ).rejects.toThrow('tool_access_denied');
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(client.exhaustedKeyToolNames).toEqual([]);
  });

  it('retries a non-JSON upstream 429 and keeps its origin in the final error', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response('<html>Too many requests</html>', { status: 429 }),
      );
    const client = buildClient(fetchImplementation);

    await expect(
      client.listUploadPage({
        uploadsPlaylistId: 'UU000',
        asOf: '2026-11-20T05:00:00Z',
      }),
    ).rejects.toThrow('upstream response; key tool: key-a');
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
  });
});
