import { describe, expect, it } from 'vitest';

import { type VideoStats } from 'src/logic-functions/types/video-stats.type';
import {
  computeAnalytics,
  computeWindowStats,
  selectLongFormVideos,
} from 'src/logic-functions/utils/youtube-analytics-metrics.util';

const buildVideo = (
  videoId: string,
  views: number,
  publishedAt: string,
  overrides: Partial<VideoStats> = {},
): VideoStats => ({
  videoId,
  views,
  likes: Math.round(views * 0.05),
  comments: 0,
  publishedAt,
  durationSeconds: 600,
  liveBroadcastContent: 'none',
  ...overrides,
});

describe('computeWindowStats', () => {
  it('trims the lowest and highest videos by view count', () => {
    const result = computeWindowStats(
      [
        buildVideo('low', 100, '2026-08-01T00:00:00Z'),
        buildVideo('middle-1', 200, '2026-08-02T00:00:00Z'),
        buildVideo('middle-2', 300, '2026-08-03T00:00:00Z'),
        buildVideo('high', 10_000, '2026-08-04T00:00:00Z'),
      ],
      1_000,
    );

    expect(result).toMatchObject({
      averageViews: 250,
      medianViews: 250,
      engagementRate: 5,
      medianEngagementRate: 5,
      viewRate: 25,
      videosUsed: 2,
      reliable: true,
    });
  });

  it('leaves the view rate empty when the subscriber count is hidden', () => {
    const result = computeWindowStats(
      [buildVideo('only', 100, '2026-08-01T00:00:00Z')],
      null,
    );

    expect(result).toMatchObject({ viewRate: null, reliable: false });
  });
});

describe('selectLongFormVideos', () => {
  it('enforces the cutoff and removes shorts and active live video', () => {
    const selected = selectLongFormVideos({
      videos: [
        buildVideo('new', 100, '2026-08-29T00:00:00Z'),
        buildVideo('short', 100, '2026-08-27T00:00:00Z', {
          durationSeconds: 180,
        }),
        buildVideo('live', 100, '2026-08-26T00:00:00Z', {
          liveBroadcastContent: 'live',
        }),
        buildVideo('upcoming', 100, '2026-08-26T00:00:00Z', {
          liveBroadcastContent: 'upcoming',
        }),
        buildVideo('keep', 100, '2026-08-25T00:00:00Z'),
      ],
      asOf: '2026-08-28T23:59:59.999Z',
      minimumDurationSeconds: 240,
      maxUploads: 60,
    });

    expect(selected.map((video) => video.videoId)).toEqual(['keep']);
  });

  it('keeps a video one second over three minutes with the production minimum', () => {
    const selected = selectLongFormVideos({
      videos: [
        buildVideo('three-minutes', 100, '2026-08-25T00:00:00Z', {
          durationSeconds: 180,
        }),
        buildVideo('just-over', 100, '2026-08-24T00:00:00Z', {
          durationSeconds: 181,
        }),
      ],
      asOf: '2026-08-28T23:59:59.999Z',
      minimumDurationSeconds: 181,
      maxUploads: 60,
    });

    expect(selected.map((video) => video.videoId)).toEqual(['just-over']);
  });
});

describe('computeAnalytics', () => {
  it('uses the supplied as-of date for recent and yearly windows', () => {
    const result = computeAnalytics({
      videos: [
        buildVideo('recent', 1_000, '2026-08-20T00:00:00Z'),
        buildVideo('older', 2_000, '2026-05-01T00:00:00Z'),
        buildVideo('year-old', 3_000, '2025-08-27T00:00:00Z'),
      ],
      subscriberCount: 10_000,
      asOf: '2026-08-28T23:59:59.999Z',
      lookback: 12,
      recentWindowDays: 60,
    });

    expect(result).toMatchObject({
      averageViews: 2_000,
      averageViews60d: 1_000,
      lastPostDate: '2026-08-20T00:00:00Z',
      postsPerMonth: 0.17,
    });
  });

  it('returns null when no video qualifies', () => {
    expect(
      computeAnalytics({
        videos: [],
        subscriberCount: 10_000,
        asOf: '2026-08-28T23:59:59.999Z',
        lookback: 12,
        recentWindowDays: 60,
      }),
    ).toBeNull();
  });
});
