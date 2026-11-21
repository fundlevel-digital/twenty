import { expect, it } from 'vitest';
import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import { type VideoStats } from 'src/logic-functions/types/video-stats.type';
import {
  computeYoutubeMetricFields,
  getYoutubeMetricFields,
} from 'src/logic-functions/utils/youtube-metric-fields.util';

const OPTIONS = {
  ...YOUTUBE_ANALYTICS_SYNC_OPTIONS,
  lookback: 2,
  timeframeDays: [1, 7, 30],
  numberTimeframeDays: [1, 7],
  percentageTimeframeDays: [7, 30],
};
const VIDEO: VideoStats = {
  videoId: 'one',
  publishedAt: '2026-11-21T00:00:00Z',
  views: 100,
  likes: 8,
  comments: 2,
  durationSeconds: 600,
  liveBroadcastContent: 'none',
};

it('generates filterable numeric field definitions for independent count and percentage windows', () => {
  const fields = getYoutubeMetricFields(OPTIONS);
  expect(
    fields.find(({ name }) => name === 'youtubeAnalyticsAverageLikesLast1Days')
      ?.label,
  ).toBe('Average Likes (Last 1 Day)');
  expect(
    fields.some(
      ({ name }) => name === 'youtubeAnalyticsAverageViewsLast30Days',
    ),
  ).toBe(false);
  expect(
    fields.some(
      ({ name }) => name === 'youtubeAnalyticsEngagementRateLast1Days',
    ),
  ).toBe(false);
  expect(
    fields.some(
      ({ name }) => name === 'youtubeAnalyticsEngagementRateLast30Days',
    ),
  ).toBe(true);
});
it.each(['NUMBERS', 'PERCENTAGES'] as const)(
  'generates only selected metric format %s',
  (metricFormat) => {
    const fields = getYoutubeMetricFields({ ...OPTIONS, metricFormat });
    expect(
      fields.every(
        ({ format }) =>
          format === (metricFormat === 'NUMBERS' ? 'number' : 'percentage'),
      ),
    ).toBe(true);
  },
);
it('calculates all windows from the same videos and stores percentages as native fractional values', () => {
  const result = computeYoutubeMetricFields({
    videos: [
      VIDEO,
      {
        ...VIDEO,
        videoId: 'older',
        publishedAt: '2026-11-18T00:00:00Z',
        views: 300,
        likes: 30,
        comments: 0,
      },
    ],
    subscriberCount: 1000,
    asOf: '2026-11-21T12:00:00Z',
    options: OPTIONS,
  });
  expect(result).toMatchObject({
    youtubeAnalyticsAverageViewsLast1Days: 100,
    youtubeAnalyticsAverageViewsLast7Days: 200,
    youtubeAnalyticsAverageLikesLast7Days: 19,
    youtubeAnalyticsAverageCommentsLast7Days: 1,
    youtubeAnalyticsEngagementRateLast7Days: 0.1,
    youtubeAnalyticsViewRateLast7Days: 0.2,
    youtubeAnalyticsAverageViewsLatest2Videos: 200,
  });
});
it('keeps empty-window metrics and unavailable view rates null', () => {
  const result = computeYoutubeMetricFields({
    videos: [{ ...VIDEO, publishedAt: '2026-11-18T00:00:00Z' }],
    subscriberCount: null,
    asOf: '2026-11-21T12:00:00Z',
    options: OPTIONS,
  });
  expect(result.youtubeAnalyticsAverageViewsLast1Days).toBeNull();
  expect(result.youtubeAnalyticsViewRateLast7Days).toBeNull();
});
it('includes the exact window boundary and excludes future uploads', () => {
  const fields = computeYoutubeMetricFields({
    videos: [
      { ...VIDEO, publishedAt: '2026-11-20T12:00:00Z' },
      {
        ...VIDEO,
        videoId: 'future',
        publishedAt: '2026-11-22T00:00:00Z',
        views: 10000,
      },
    ],
    subscriberCount: 1000,
    asOf: '2026-11-21T12:00:00Z',
    options: OPTIONS,
  });
  expect(fields.youtubeAnalyticsAverageViewsLast1Days).toBe(100);
});
