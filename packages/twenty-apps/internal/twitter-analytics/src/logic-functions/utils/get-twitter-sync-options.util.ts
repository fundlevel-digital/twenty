import {
  MAX_TWITTER_TIMEFRAMES,
  MAX_TWITTER_TIMEFRAME_DAYS,
} from 'src/constants/twitter-timeframe-limits.constant';
import { parseTwitterTimeframes } from 'src/utils/parse-twitter-timeframes.util';

import { TWITTER_ANALYTICS_SYNC_OPTIONS } from 'src/logic-functions/constants/twitter-analytics-sync-options.constant';
import { type TwitterAnalyticsSyncOptions } from 'src/logic-functions/types/twitter-analytics-sync-options.type';

export const getTwitterSyncOptions = (): TwitterAnalyticsSyncOptions => {
  const lookback = Number(process.env.RECENT_POST_COUNT ?? '12');
  if (!Number.isInteger(lookback) || lookback < 2 || lookback > 30) {
    throw new Error(
      'RECENT_POST_COUNT must be a whole number from 2 to 30. Set it in Settings -> Applications -> Twitter Analytics.',
    );
  }
  const readTimeframes = (key: string): number[] => {
    const days = parseTwitterTimeframes(process.env[key] ?? '["30","60","90"]');
    if (days === null)
      throw new Error(
        `${key} must contain 1 to ${MAX_TWITTER_TIMEFRAMES} whole-day windows from 1 to ${MAX_TWITTER_TIMEFRAME_DAYS}.`,
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
    ...TWITTER_ANALYTICS_SYNC_OPTIONS,
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
