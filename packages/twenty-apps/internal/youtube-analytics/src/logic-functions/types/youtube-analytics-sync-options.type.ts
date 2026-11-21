export type YoutubeAnalyticsSyncOptions = {
  lookback: number;
  recentWindowDays: number;
  maxUploads: number;
  minimumDurationSeconds: number;
  concurrency: number;
};
