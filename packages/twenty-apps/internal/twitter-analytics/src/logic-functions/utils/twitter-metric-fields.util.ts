import { MILLISECONDS_PER_DAY } from 'src/logic-functions/constants/milliseconds-per-day.constant';
import { type PostStats } from 'src/logic-functions/types/post-stats.type';
import { type WindowStats } from 'src/logic-functions/types/window-stats.type';
import { type TwitterAnalyticsSyncOptions } from 'src/logic-functions/types/twitter-analytics-sync-options.type';
import { computeWindowStats } from 'src/logic-functions/utils/twitter-analytics-metrics.util';

export const TWITTER_METRIC_FIELD_PREFIX = 'twitterAnalytics';
export const TWITTER_METRIC_FIELD_DESCRIPTION =
  'Managed by Twitter Analytics. Public post statistics for the named calculation window.';

type Metric = {
  key: keyof Pick<
    WindowStats,
    | 'averageViews'
    | 'medianViews'
    | 'averageLikes'
    | 'medianLikes'
    | 'averageReplies'
    | 'medianReplies'
    | 'engagementRate'
    | 'medianEngagementRate'
    | 'viewRate'
  >;
  label: string;
  format: 'number' | 'percentage';
  icon: string;
};

const METRICS: Metric[] = [
  {
    key: 'averageViews',
    label: 'Average Views',
    format: 'number',
    icon: 'IconEye',
  },
  {
    key: 'medianViews',
    label: 'Median Views',
    format: 'number',
    icon: 'IconEye',
  },
  {
    key: 'averageLikes',
    label: 'Average Likes',
    format: 'number',
    icon: 'IconHeart',
  },
  {
    key: 'medianLikes',
    label: 'Median Likes',
    format: 'number',
    icon: 'IconHeart',
  },
  {
    key: 'averageReplies',
    label: 'Average Replies',
    format: 'number',
    icon: 'IconMessageCircle',
  },
  {
    key: 'medianReplies',
    label: 'Median Replies',
    format: 'number',
    icon: 'IconMessageCircle',
  },
  {
    key: 'engagementRate',
    label: 'Average Engagement %',
    format: 'percentage',
    icon: 'IconPercentage',
  },
  {
    key: 'medianEngagementRate',
    label: 'Median Engagement %',
    format: 'percentage',
    icon: 'IconPercentage',
  },
  {
    key: 'viewRate',
    label: 'Average View Rate %',
    format: 'percentage',
    icon: 'IconPercentage',
  },
];

type MetricWindow = { unit: 'days' | 'posts'; count: number };

export type TwitterMetricField = Metric & {
  name: string;
  window: MetricWindow;
};

export const getTwitterMetricFields = (
  options: TwitterAnalyticsSyncOptions,
): TwitterMetricField[] => {
  const windows: MetricWindow[] = [
    { unit: 'posts', count: options.lookback },
    ...options.timeframeDays.map((count) => ({ unit: 'days' as const, count })),
  ];
  return windows.flatMap((window) => {
    const suffix =
      window.unit === 'days'
        ? `Last${window.count}Days`
        : `Latest${window.count}Posts`;
    const windowLabel =
      window.unit === 'days'
        ? `Last ${window.count} ${window.count === 1 ? 'Day' : 'Days'}`
        : `Latest ${window.count} Posts`;
    return METRICS.filter(
      ({ format }) =>
        (options.metricFormat === 'BOTH' ||
          (options.metricFormat === 'NUMBERS'
            ? format === 'number'
            : format === 'percentage')) &&
        (window.unit === 'posts' ||
          (format === 'number'
            ? options.numberTimeframeDays
            : options.percentageTimeframeDays
          ).includes(window.count)),
    ).map((metric) => ({
      ...metric,
      label: `${metric.label} (${windowLabel})`,
      name: `${TWITTER_METRIC_FIELD_PREFIX}${metric.key[0].toUpperCase()}${metric.key.slice(1)}${suffix}`,
      window,
    }));
  });
};

export const computeTwitterMetricFields = ({
  posts,
  followerCount,
  asOf,
  options,
}: {
  posts: PostStats[];
  followerCount: number | null;
  asOf: string;
  options: TwitterAnalyticsSyncOptions;
}): Record<string, number | null> => {
  const fields = getTwitterMetricFields(options);
  const statsByWindow = new Map<string, WindowStats | null>();
  return Object.fromEntries(
    fields.map((field) => {
      const key = `${field.window.unit}-${field.window.count}`;
      if (!statsByWindow.has(key)) {
        const boundary =
          Date.parse(asOf) - field.window.count * MILLISECONDS_PER_DAY;
        const selected =
          field.window.unit === 'posts'
            ? posts.slice(0, field.window.count)
            : posts.filter(
                ({ publishedAt }) =>
                  publishedAt !== null &&
                  Date.parse(publishedAt) >= boundary &&
                  Date.parse(publishedAt) <= Date.parse(asOf),
              );
        statsByWindow.set(key, computeWindowStats(selected, followerCount));
      }
      const value = statsByWindow.get(key)?.[field.key] ?? null;
      return [
        field.name,
        value === null || field.format === 'number' ? value : value / 100,
      ];
    }),
  );
};
