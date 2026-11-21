import { MILLISECONDS_PER_DAY } from 'src/logic-functions/constants/milliseconds-per-day.constant';
import { type VideoStats } from 'src/logic-functions/types/video-stats.type';
import { type WindowStats } from 'src/logic-functions/types/window-stats.type';
import { type YoutubeAnalyticsSyncOptions } from 'src/logic-functions/types/youtube-analytics-sync-options.type';
import { computeWindowStats } from 'src/logic-functions/utils/youtube-analytics-metrics.util';

export const YOUTUBE_METRIC_FIELD_PREFIX = 'youtubeAnalytics';
export const YOUTUBE_METRIC_FIELD_DESCRIPTION =
  'Managed by YouTube Analytics. Public video statistics for the named calculation window.';

type Metric = {
  key: keyof Pick<
    WindowStats,
    | 'averageViews'
    | 'medianViews'
    | 'averageLikes'
    | 'medianLikes'
    | 'averageComments'
    | 'medianComments'
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
    key: 'averageComments',
    label: 'Average Comments',
    format: 'number',
    icon: 'IconMessageCircle',
  },
  {
    key: 'medianComments',
    label: 'Median Comments',
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

type MetricWindow = { unit: 'days' | 'videos'; count: number };

export type YoutubeMetricField = Metric & {
  name: string;
  window: MetricWindow;
};

export const getYoutubeMetricFields = (
  options: YoutubeAnalyticsSyncOptions,
): YoutubeMetricField[] => {
  const windows: MetricWindow[] = [
    { unit: 'videos', count: options.lookback },
    ...options.timeframeDays.map((count) => ({ unit: 'days' as const, count })),
  ];
  return windows.flatMap((window) => {
    const suffix =
      window.unit === 'days'
        ? `Last${window.count}Days`
        : `Latest${window.count}Videos`;
    const windowLabel =
      window.unit === 'days'
        ? `Last ${window.count} ${window.count === 1 ? 'Day' : 'Days'}`
        : `Latest ${window.count} Videos`;
    return METRICS.filter(
      ({ format }) =>
        (options.metricFormat === 'BOTH' ||
          (options.metricFormat === 'NUMBERS'
            ? format === 'number'
            : format === 'percentage')) &&
        (window.unit === 'videos' ||
          (format === 'number'
            ? options.numberTimeframeDays
            : options.percentageTimeframeDays
          ).includes(window.count)),
    ).map((metric) => ({
      ...metric,
      label: `${metric.label} (${windowLabel})`,
      name: `${YOUTUBE_METRIC_FIELD_PREFIX}${metric.key[0].toUpperCase()}${metric.key.slice(1)}${suffix}`,
      window,
    }));
  });
};

export const computeYoutubeMetricFields = ({
  videos,
  subscriberCount,
  asOf,
  options,
}: {
  videos: VideoStats[];
  subscriberCount: number | null;
  asOf: string;
  options: YoutubeAnalyticsSyncOptions;
}): Record<string, number | null> => {
  const fields = getYoutubeMetricFields(options);
  const statsByWindow = new Map<string, WindowStats | null>();
  return Object.fromEntries(
    fields.map((field) => {
      const key = `${field.window.unit}-${field.window.count}`;
      if (!statsByWindow.has(key)) {
        const boundary =
          Date.parse(asOf) - field.window.count * MILLISECONDS_PER_DAY;
        const selected =
          field.window.unit === 'videos'
            ? videos.slice(0, field.window.count)
            : videos.filter(
                ({ publishedAt }) =>
                  publishedAt !== null &&
                  Date.parse(publishedAt) >= boundary &&
                  Date.parse(publishedAt) <= Date.parse(asOf),
              );
        statsByWindow.set(key, computeWindowStats(selected, subscriberCount));
      }
      const value = statsByWindow.get(key)?.[field.key] ?? null;
      return [
        field.name,
        value === null || field.format === 'number' ? value : value / 100,
      ];
    }),
  );
};
