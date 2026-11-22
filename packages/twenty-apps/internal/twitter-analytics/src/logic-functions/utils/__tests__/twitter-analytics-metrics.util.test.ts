import { describe, expect, it } from 'vitest';

import { type PostStats } from 'src/logic-functions/types/post-stats.type';
import {
  computeAnalytics,
  computeWindowStats,
  selectOriginalPosts,
} from 'src/logic-functions/utils/twitter-analytics-metrics.util';

const buildPost = (
  postId: string,
  views: number,
  publishedAt: string,
  overrides: Partial<PostStats> = {},
): PostStats => ({
  postId,
  views,
  likes: Math.round(views * 0.05),
  replies: 0,
  publishedAt,
  durationSeconds: 600,
  liveBroadcastContent: 'none',
  ...overrides,
});

describe('computeWindowStats', () => {
  it('trims the lowest and highest posts by view count', () => {
    const result = computeWindowStats(
      [
        buildPost('low', 100, '2026-08-01T00:00:00Z'),
        buildPost('middle-1', 200, '2026-08-02T00:00:00Z'),
        buildPost('middle-2', 300, '2026-08-03T00:00:00Z'),
        buildPost('high', 10_000, '2026-08-04T00:00:00Z'),
      ],
      1_000,
    );

    expect(result).toMatchObject({
      averageViews: 250,
      medianViews: 250,
      engagementRate: 5,
      medianEngagementRate: 5,
      viewRate: 25,
      postsUsed: 2,
      reliable: true,
    });
  });

  it('leaves the view rate empty when the follower count is hidden', () => {
    const result = computeWindowStats(
      [buildPost('only', 100, '2026-08-01T00:00:00Z')],
      null,
    );

    expect(result).toMatchObject({ viewRate: null, reliable: false });
  });
});

describe('selectOriginalPosts', () => {
  it('enforces the cutoff and removes shorts and active live post', () => {
    const selected = selectOriginalPosts({
      posts: [
        buildPost('new', 100, '2026-08-29T00:00:00Z'),
        buildPost('short', 100, '2026-08-27T00:00:00Z', {
          durationSeconds: 180,
        }),
        buildPost('live', 100, '2026-08-26T00:00:00Z', {
          liveBroadcastContent: 'live',
        }),
        buildPost('upcoming', 100, '2026-08-26T00:00:00Z', {
          liveBroadcastContent: 'upcoming',
        }),
        buildPost('keep', 100, '2026-08-25T00:00:00Z'),
      ],
      asOf: '2026-08-28T23:59:59.999Z',
      minimumDurationSeconds: 240,
      maxUploads: 60,
    });

    expect(selected.map((post) => post.postId)).toEqual(['keep']);
  });

  it('keeps a post one second over three minutes with the production minimum', () => {
    const selected = selectOriginalPosts({
      posts: [
        buildPost('three-minutes', 100, '2026-08-25T00:00:00Z', {
          durationSeconds: 180,
        }),
        buildPost('just-over', 100, '2026-08-24T00:00:00Z', {
          durationSeconds: 181,
        }),
      ],
      asOf: '2026-08-28T23:59:59.999Z',
      minimumDurationSeconds: 181,
      maxUploads: 60,
    });

    expect(selected.map((post) => post.postId)).toEqual(['just-over']);
  });
});

describe('computeAnalytics', () => {
  it('uses the supplied as-of date for recent and yearly windows', () => {
    const result = computeAnalytics({
      posts: [
        buildPost('recent', 1_000, '2026-08-20T00:00:00Z'),
        buildPost('older', 2_000, '2026-05-01T00:00:00Z'),
        buildPost('year-old', 3_000, '2025-08-27T00:00:00Z'),
      ],
      followerCount: 10_000,
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

  it('returns null when no post qualifies', () => {
    expect(
      computeAnalytics({
        posts: [],
        followerCount: 10_000,
        asOf: '2026-08-28T23:59:59.999Z',
        lookback: 12,
        recentWindowDays: 60,
      }),
    ).toBeNull();
  });
});

it('changes recent-post metrics with the configured window and preserves the 60-day window', () => {
  const posts = Array.from({ length: 30 }, (_, index) => ({
    postId: `post-${index}`,
    publishedAt: new Date(Date.UTC(2026, 7, 30 - index)).toISOString(),
    durationSeconds: 600,
    liveBroadcastContent: 'none',
    views: (index + 1) * 100,
    likes: 10,
    replies: 0,
  }));
  const calculate = (lookback: number) =>
    computeAnalytics({
      posts,
      followerCount: 1000,
      asOf: '2026-08-31T00:00:00Z',
      lookback,
      recentWindowDays: 60,
    });

  const narrow = calculate(2);
  const wide = calculate(30);

  expect(narrow?.averageViews).toBe(150);
  expect(wide?.averageViews).toBe(1550);
  expect(narrow?.averageViewRate).toBe(15);
  expect(wide?.averageViewRate).toBe(155);
  expect(narrow?.averageViews60d).toBe(wide?.averageViews60d);
});
