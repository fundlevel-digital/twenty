import { afterEach, describe, expect, it, vi } from 'vitest';
import { listConnections } from 'twenty-sdk/logic-function';

import {
  refreshYoutubeAnalytics,
  refreshYoutubeAnalyticsHandler,
} from 'src/logic-functions/handlers/refresh-youtube-analytics.handler';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import { YoutubeClient } from 'src/logic-functions/utils/youtube-client';

vi.mock('twenty-sdk/logic-function', () => ({ listConnections: vi.fn() }));
vi.mock(
  'src/logic-functions/utils/synchronize-youtube-metric-fields.util',
  () => ({ synchronizeYoutubeMetricFields: vi.fn() }),
);

type MutationVariables = { id: string; data: Record<string, unknown> };

type QueryVariables = { filter: unknown; first: number; after?: string };

const CHANNEL_ID = 'UC0000000000000000000000';

const buildEntryNode = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  name: '',
  ...fields,
});

const buildClientMock = ({
  nodes,
  failMutation = false,
}: {
  nodes: unknown[];
  failMutation?: boolean;
}) => {
  const queries: QueryVariables[] = [];
  const mutations: MutationVariables[] = [];
  const client: WorkspaceGraphqlClient = {
    request: vi.fn(
      async (query: string, variables: Record<string, unknown>) => {
        if (query.includes('updateYoutubeChannel(')) {
          mutations.push(variables as MutationVariables);

          if (failMutation) {
            throw new Error('Twenty update failed with status 500');
          }

          return { updateYoutubeChannel: { id: variables.id } };
        }

        queries.push(variables as QueryVariables);

        return {
          youtubeChannels: {
            edges: nodes.map((node) => ({ node })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        };
      },
    ) as WorkspaceGraphqlClient['request'],
  };

  return { client, queries, mutations };
};

const youtubeFetch = (async (input: string | URL | Request) => {
  const path = new URL(String(input)).pathname;

  if (path.endsWith('/youtube/v3/channels')) {
    return Response.json({
      items: [
        {
          id: CHANNEL_ID,
          snippet: { title: 'Creator', customUrl: '@creator' },
          contentDetails: { relatedPlaylists: { uploads: 'UU000' } },
          statistics: { subscriberCount: '1000' },
        },
      ],
    });
  }

  if (path.endsWith('/youtube/v3/playlistItems')) {
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

const buildYoutubeClient = () =>
  new YoutubeClient({
    credentials: [{ id: 'api-key-1', apiKey: 'key-a' }],
    fetchImplementation: youtubeFetch,
    waitImplementation: async () => {},
  });

const NOW = new Date('2026-08-28T05:00:00.000Z');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('refreshYoutubeAnalytics', () => {
  it('stores channel identity, subscribers and metrics on the app-owned channel', async () => {
    const { client, queries, mutations } = buildClientMock({
      nodes: [buildEntryNode('channel-1', { youtubeId: CHANNEL_ID })],
    });
    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'calculationsEnabled' },
      now: () => NOW,
    });
    expect(queries).toEqual([
      { filter: { calculationsEnabled: { eq: true } }, first: 200 },
    ]);
    expect(result).toMatchObject({
      entriesSelected: 1,
      entriesWritten: 1,
      entriesFailed: 0,
    });
    expect(mutations[0]).toMatchObject({
      id: 'channel-1',
      data: {
        name: 'Creator',
        youtubeId: CHANNEL_ID,
        youtubeHandle: '@creator',
        youtubeUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
        uploadsPlaylistId: 'UU000',
        subscriberCount: 1000,
        averageViews: 100,
        medianViews: 100,
        averageEngagementPercentage: 6,
        medianEngagementPercentage: 6,
        averageViewRate: 10,
        averageViews60d: 100,
        medianViews60d: 100,
        averageEngagementPercentage60d: 6,
        medianEngagementPercentage60d: 6,
        averageViewRate60d: 10,
        lastPostDate: '2026-08-01',
        postsPerMonth: 0.08,
        averageStatisticsUpdatedAt: '2026-08-28',
        lastCalculatedAt: NOW.toISOString(),
        calculationStatus: 'READY',
        calculationError: '',
        recentVideoCount: 12,
        videosAnalyzed: 1,
      },
    });
    expect(
      vi
        .mocked(client.request)
        .mock.calls.every(([query]) => !query.includes('influencerAnalytics')),
    ).toBe(true);
  });

  it('preserves a custom channel name', async () => {
    const { client, mutations } = buildClientMock({
      nodes: [
        buildEntryNode('channel-1', {
          name: 'My channel label',
          youtubeId: CHANNEL_ID,
        }),
      ],
    });
    await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'calculationsEnabled' },
    });
    expect(mutations[0].data).not.toHaveProperty('name');
  });

  it('records missing identities without overwriting existing metrics', async () => {
    const { client, mutations } = buildClientMock({
      nodes: [buildEntryNode('channel-1')],
    });
    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'calculationsEnabled' },
    });
    expect(result).toMatchObject({ entriesFailed: 1, missingIdentity: 1 });
    expect(mutations[0].data).toEqual({
      calculationStatus: 'FAILED',
      calculationError: 'no YouTube channel identity',
    });
  });

  it('records a failed write once without retrying it', async () => {
    const { client, mutations } = buildClientMock({
      nodes: [buildEntryNode('channel-1', { youtubeId: CHANNEL_ID })],
      failMutation: true,
    });
    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'calculationsEnabled' },
    });
    expect(mutations).toHaveLength(1);
    expect(result.failures).toEqual([
      { entryId: 'channel-1', reason: 'Twenty update failed with status 500' },
    ]);
  });

  it('selects only channel records named in a manual request', async () => {
    const { client, queries } = buildClientMock({ nodes: [] });
    await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'records', channelIds: ['channel-1'] },
    });
    expect(queries[0].filter).toEqual({ id: { in: ['channel-1'] } });
  });

  it('refreshes nothing when a route names no channels', async () => {
    const { client, queries } = buildClientMock({ nodes: [] });
    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'records', channelIds: [] },
    });
    expect(queries).toHaveLength(0);
    expect(result.entriesSelected).toBe(0);
  });
});

describe('refreshYoutubeAnalyticsHandler', () => {
  it('refuses invalid settings before fetching credentials or reading records', async () => {
    vi.stubEnv('RECENT_VIDEO_COUNT', '31');
    const createClient = vi.fn();
    vi.mocked(listConnections).mockClear();
    await expect(
      refreshYoutubeAnalyticsHandler({}, createClient),
    ).rejects.toThrow('RECENT_VIDEO_COUNT');
    expect(createClient).not.toHaveBeenCalled();
    expect(listConnections).not.toHaveBeenCalled();
  });

  it('refuses to run when no keys are connected', async () => {
    vi.mocked(listConnections).mockResolvedValue([]);
    const createClient = vi.fn();
    await expect(
      refreshYoutubeAnalyticsHandler({}, createClient),
    ).rejects.toThrow('No usable YouTube API key connections');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('uses the configured count and selected channel IDs', async () => {
    vi.stubEnv('RECENT_VIDEO_COUNT', '2');
    vi.mocked(listConnections).mockResolvedValue([
      {
        id: 'first',
        providerType: 'api-key',
        accessToken: 'key-a',
        authFailedAt: null,
      },
    ] as Awaited<ReturnType<typeof listConnections>>);
    vi.stubGlobal('fetch', youtubeFetch);
    const { client, mutations, queries } = buildClientMock({
      nodes: [buildEntryNode('channel-1', { youtubeId: CHANNEL_ID })],
    });
    await refreshYoutubeAnalyticsHandler(
      { requestContext: {}, body: { channelIds: ['channel-1'] } } as Parameters<
        typeof refreshYoutubeAnalyticsHandler
      >[0],
      () => client,
    );
    expect(queries[0].filter).toEqual({ id: { in: ['channel-1'] } });
    expect(mutations[0].data.recentVideoCount).toBe(2);
  });
});
