import { type YoutubeAnalyticsSyncOptions } from 'src/logic-functions/types/youtube-analytics-sync-options.type';

// 181 seconds skips videos of three minutes or less: the Data API has no
// Shorts flag, so duration is the stand-in and can drop a regular short video.
export const YOUTUBE_ANALYTICS_SYNC_OPTIONS: YoutubeAnalyticsSyncOptions = {
  lookback: 12,
  recentWindowDays: 60,
  maxUploads: 5000,
  minimumDurationSeconds: 181,
  concurrency: 2,
  timeframeDays: [30, 60, 90],
  numberTimeframeDays: [30, 60, 90],
  percentageTimeframeDays: [30, 60, 90],
  metricFormat: 'BOTH',
};
