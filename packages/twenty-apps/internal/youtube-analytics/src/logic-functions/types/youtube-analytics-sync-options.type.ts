export type YoutubeAnalyticsSyncOptions = {
  lookback: number;
  recentWindowDays: number;
  maxUploads: number;
  minimumDurationSeconds: number;
  concurrency: number;
  timeframeDays: number[];
  numberTimeframeDays: number[];
  percentageTimeframeDays: number[];
  metricFormat: 'NUMBERS' | 'PERCENTAGES' | 'BOTH';
};
