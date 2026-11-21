import {
  MAX_YOUTUBE_TIMEFRAMES,
  MAX_YOUTUBE_TIMEFRAME_DAYS,
} from 'src/constants/youtube-timeframe-limits.constant';
import { parseYoutubeTimeframes } from 'src/utils/parse-youtube-timeframes.util';

import { YOUTUBE_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/youtube-analytics-sync-options.constant';
import { type YoutubeAnalyticsSyncOptions } from 'src/logic-functions/types/youtube-analytics-sync-options.type';

export const getYoutubeSyncOptions = (): YoutubeAnalyticsSyncOptions => {
  const lookback = Number(process.env.RECENT_VIDEO_COUNT ?? '12');
  if (!Number.isInteger(lookback) || lookback < 2 || lookback > 30) {
    throw new Error(
      'RECENT_VIDEO_COUNT must be a whole number from 2 to 30. Set it in Settings -> Applications -> YouTube Analytics.',
    );
  }
  const readTimeframes = (key: string): number[] => {
    const days = parseYoutubeTimeframes(process.env[key] ?? '["30","60","90"]');
    if (days === null)
      throw new Error(
        `${key} must contain 1 to ${MAX_YOUTUBE_TIMEFRAMES} whole-day windows from 1 to ${MAX_YOUTUBE_TIMEFRAME_DAYS}.`,
      );
    return days;
  };
  const numberTimeframeDays = readTimeframes('NUMBER_TIMEFRAME_DAYS');
  const percentageTimeframeDays = readTimeframes('PERCENTAGE_TIMEFRAME_DAYS');
  const metricFormat = process.env.METRIC_FORMAT ?? 'BOTH';
  if (
    metricFormat !== 'NUMBERS' &&
    metricFormat !== 'PERCENTAGES' &&
    metricFormat !== 'BOTH'
  ) {
    throw new Error('METRIC_FORMAT must be NUMBERS, PERCENTAGES or BOTH.');
  }
  return {
    ...YOUTUBE_ANALYTICS_SYNC_OPTIONS,
    lookback,
    numberTimeframeDays,
    percentageTimeframeDays,
    timeframeDays: [
      ...new Set([
        ...(metricFormat !== 'PERCENTAGES' ? numberTimeframeDays : []),
        ...(metricFormat !== 'NUMBERS' ? percentageTimeframeDays : []),
      ]),
    ],
    metricFormat,
  };
};
