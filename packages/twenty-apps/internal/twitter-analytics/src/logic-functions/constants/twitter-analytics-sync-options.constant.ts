import { type TwitterAnalyticsSyncOptions } from 'src/logic-functions/types/twitter-analytics-sync-options.type';

export const TWITTER_ANALYTICS_SYNC_OPTIONS: TwitterAnalyticsSyncOptions = {
  lookback: 12,
  recentWindowDays: 60,
  maxUploads: 5000,
  minimumDurationSeconds: 0,
  concurrency: 2,
  timeframeDays: [30, 60, 90],
  numberTimeframeDays: [30, 60, 90],
  percentageTimeframeDays: [30, 60, 90],
  metricFormat: 'BOTH',
};
