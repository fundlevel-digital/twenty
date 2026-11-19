import { afterEach, describe, expect, it, vi } from 'vitest';

import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import {
  refreshYoutubeAnalytics,
  refreshYoutubeAnalyticsHandler,
} from 'src/logic-functions/handlers/refresh-youtube-analytics.handler';
import { type WorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';
import { YoutubeClient } from 'src/logic-functions/utils/youtube-client';

type MutationVariables = { id: string; data: Record<string, unknown> };

type QueryVariables = { filter: unknown; first: number; after?: string };

const CHANNEL_ID = 'UC0000000000000000000000';

const buildEntryNode = (
  entryId: string,
  influencer: Record<string, unknown> | null,
) => ({ id: entryId, name: '', influencer });

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
        if (query.includes('updateInfluencerAnalyticsEntry(')) {
          mutations.push(variables as MutationVariables);

          if (failMutation) {
            throw new Error('Twenty update failed with status 500');
          }

          return { updateInfluencerAnalyticsEntry: { id: variables.id } };
        }

        queries.push(variables as QueryVariables);

        return {
          influencerAnalyticsEntries: {
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
    tregToken: 'treg-token',
    keyToolNames: ['key-a'],
    fetchImplementation: youtubeFetch,
    waitImplementation: async () => {},
  });

const NOW = new Date('2026-08-28T05:00:00.000Z');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('refreshYoutubeAnalytics', () => {
  it('uses the production metric windows', () => {
    expect(YOUTUBE_ANALYTICS_SYNC_OPTIONS).toEqual({
      lookback: 12,
      recentWindowDays: 60,
      maxUploads: 60,
      minimumDurationSeconds: 181,
      concurrency: 4,
    });
  });

  it('writes the computed metrics to every entry of the influencer', async () => {
    const influencer = {
      id: 'influencer-1',
      name: 'Creator',
      youtubeId: CHANNEL_ID,
      youtubeHandle: '',
      youtubeUrl: '',
    };
    const { client, queries, mutations } = buildClientMock({
      nodes: [
        buildEntryNode('entry-1', influencer),
        buildEntryNode('entry-2', influencer),
      ],
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
      entriesSelected: 2,
      entriesWritten: 2,
      entriesFailed: 0,
      quota: { channelsList: 1, playlistItemsList: 1, videosList: 1, total: 3 },
    });
    expect(mutations.map((mutation) => mutation.id)).toEqual([
      'entry-1',
      'entry-2',
    ]);
    expect(mutations[0]?.data).toEqual({
      averageViews: 100,
      averageEngagementPercentage: 6,
      medianViews: 100,
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
      lastCalculatedAt: '2026-08-28T05:00:00.000Z',
      calculationStatus: 'READY',
      calculationError: '',
      name: 'Influencer YouTube Analytics — Creator',
    });
  });

  it('records the reason on entries it cannot calculate', async () => {
    const { client, mutations } = buildClientMock({
      nodes: [
        buildEntryNode('entry-1', {
          id: 'influencer-1',
          name: 'No channel',
          youtubeId: '',
          youtubeHandle: '',
          youtubeUrl: '',
        }),
        buildEntryNode('entry-2', null),
      ],
    });

    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'calculationsEnabled' },
      now: () => NOW,
    });

    expect(result).toMatchObject({
      entriesWritten: 0,
      entriesFailed: 2,
      missingIdentity: 1,
    });
    expect(mutations.map((mutation) => mutation.data)).toEqual([
      {
        calculationStatus: 'FAILED',
        calculationError: 'no YouTube channel identity',
      },
      { calculationStatus: 'FAILED', calculationError: 'no linked influencer' },
    ]);
  });

  it('does not retry a failed write', async () => {
    const { client, mutations } = buildClientMock({
      nodes: [
        buildEntryNode('entry-1', {
          id: 'influencer-1',
          name: 'Creator',
          youtubeId: CHANNEL_ID,
          youtubeHandle: null,
          youtubeUrl: null,
        }),
      ],
      failMutation: true,
    });

    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'calculationsEnabled' },
      now: () => NOW,
    });

    expect(mutations).toHaveLength(1);
    expect(result.failures).toEqual([
      {
        entryId: 'entry-1',
        influencerId: 'influencer-1',
        reason: 'Twenty update failed with status 500',
      },
    ]);
  });

  it('selects the requested entries and influencers', async () => {
    const { client, queries } = buildClientMock({ nodes: [] });

    await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: {
        kind: 'records',
        entryIds: ['entry-1'],
        influencerIds: ['influencer-1'],
      },
      now: () => NOW,
    });

    expect(queries[0]?.filter).toEqual({
      or: [
        { id: { in: ['entry-1'] } },
        { influencerId: { in: ['influencer-1'] } },
      ],
    });
  });

  it('refreshes nothing when the route names no records', async () => {
    const { client, queries } = buildClientMock({ nodes: [] });

    const result = await refreshYoutubeAnalytics({
      client,
      youtubeClient: buildYoutubeClient(),
      selection: { kind: 'records', entryIds: [], influencerIds: [] },
      now: () => NOW,
    });

    expect(queries).toHaveLength(0);
    expect(result.entriesSelected).toBe(0);
  });
});

describe('refreshYoutubeAnalyticsHandler', () => {
  it('refuses to run without a treg token', async () => {
    const fetchMock = vi.fn();
    const createClient = vi.fn();

    vi.stubEnv('TREG_TOKEN', '');
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      refreshYoutubeAnalyticsHandler({}, createClient),
    ).rejects.toThrow('TREG_TOKEN is not set');
    expect(createClient).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes enabled entries on the cron and named records on the route', async () => {
    vi.stubEnv('TREG_TOKEN', 'treg-token');
    vi.stubGlobal('fetch', youtubeFetch);
    const cronMock = buildClientMock({ nodes: [] });
    const routeMock = buildClientMock({ nodes: [] });

    await refreshYoutubeAnalyticsHandler({}, () => cronMock.client);
    await refreshYoutubeAnalyticsHandler(
      {
        headers: {},
        queryStringParameters: {},
        pathParameters: {},
        body: { influencerIds: ['influencer-1'] },
        isBase64Encoded: false,
        requestContext: {
          http: { method: 'POST', path: '/youtube-analytics/refresh' },
        },
      } as unknown as Parameters<typeof refreshYoutubeAnalyticsHandler>[0],
      () => routeMock.client,
    );

    expect(cronMock.queries[0]?.filter).toEqual({
      calculationsEnabled: { eq: true },
    });
    expect(routeMock.queries[0]?.filter).toEqual({
      or: [{ influencerId: { in: ['influencer-1'] } }],
    });
  });
});
