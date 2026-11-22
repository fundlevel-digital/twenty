import { expect, it } from 'vitest';
import { TWITTER_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/twitter-analytics-sync-options.constant';
import { type PostStats } from 'src/logic-functions/types/post-stats.type';
import {
  computeTwitterMetricFields,
  getTwitterMetricFields,
} from 'src/logic-functions/utils/twitter-metric-fields.util';

const OPTIONS = {
  ...TWITTER_ANALYTICS_SYNC_OPTIONS,
  lookback: 2,
  timeframeDays: [1, 7, 30],
  numberTimeframeDays: [1, 7],
  percentageTimeframeDays: [7, 30],
};
const POST: PostStats = {
  postId: 'one',
  publishedAt: '2026-11-21T00:00:00Z',
  views: 100,
  likes: 8,
  replies: 2,
  durationSeconds: 600,
  liveBroadcastContent: 'none',
};

it('generates filterable numeric field definitions for independent count and percentage windows', () => {
  const fields = getTwitterMetricFields(OPTIONS);
  expect(
    fields.find(({ name }) => name === 'twitterAnalyticsAverageLikesLast1Days')
      ?.label,
  ).toBe('Average Likes (Last 1 Day)');
  expect(
    fields.some(
      ({ name }) => name === 'twitterAnalyticsAverageViewsLast30Days',
    ),
  ).toBe(false);
  expect(
    fields.some(
      ({ name }) => name === 'twitterAnalyticsEngagementRateLast1Days',
    ),
  ).toBe(false);
  expect(
    fields.some(
      ({ name }) => name === 'twitterAnalyticsEngagementRateLast30Days',
    ),
  ).toBe(true);
});
it.each(['NUMBERS', 'PERCENTAGES'] as const)(
  'generates only selected metric format %s',
  (metricFormat) => {
    const fields = getTwitterMetricFields({ ...OPTIONS, metricFormat });
    expect(
      fields.every(
        ({ format }) =>
          format === (metricFormat === 'NUMBERS' ? 'number' : 'percentage'),
      ),
    ).toBe(true);
  },
);
it('calculates all windows from the same posts and stores percentages as native fractional values', () => {
  const result = computeTwitterMetricFields({
    posts: [
      POST,
      {
        ...POST,
        postId: 'older',
        publishedAt: '2026-11-18T00:00:00Z',
        views: 300,
        likes: 30,
        replies: 0,
      },
    ],
    followerCount: 1000,
    asOf: '2026-11-21T12:00:00Z',
    options: OPTIONS,
  });
  expect(result).toMatchObject({
    twitterAnalyticsAverageViewsLast1Days: 100,
    twitterAnalyticsAverageViewsLast7Days: 200,
    twitterAnalyticsAverageLikesLast7Days: 19,
    twitterAnalyticsAverageRepliesLast7Days: 1,
    twitterAnalyticsEngagementRateLast7Days: 0.1,
    twitterAnalyticsViewRateLast7Days: 0.2,
    twitterAnalyticsAverageViewsLatest2Posts: 200,
  });
});
it('keeps empty-window metrics and unavailable view rates null', () => {
  const result = computeTwitterMetricFields({
    posts: [{ ...POST, publishedAt: '2026-11-18T00:00:00Z' }],
    followerCount: null,
    asOf: '2026-11-21T12:00:00Z',
    options: OPTIONS,
  });
  expect(result.twitterAnalyticsAverageViewsLast1Days).toBeNull();
  expect(result.twitterAnalyticsViewRateLast7Days).toBeNull();
});
it('includes the exact window boundary and excludes future uploads', () => {
  const fields = computeTwitterMetricFields({
    posts: [
      { ...POST, publishedAt: '2026-11-20T12:00:00Z' },
      {
        ...POST,
        postId: 'future',
        publishedAt: '2026-11-22T00:00:00Z',
        views: 10000,
      },
    ],
    followerCount: 1000,
    asOf: '2026-11-21T12:00:00Z',
    options: OPTIONS,
  });
  expect(fields.twitterAnalyticsAverageViewsLast1Days).toBe(100);
});
