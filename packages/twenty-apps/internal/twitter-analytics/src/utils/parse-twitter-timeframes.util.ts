import { isArray } from '@sniptt/guards';

import { MAX_TWITTER_TIMEFRAMES } from 'src/constants/twitter-timeframe-limits.constant';
import { parseTwitterTimeframe } from 'src/utils/parse-twitter-timeframe.util';

export const parseTwitterTimeframes = (rawValue: string): number[] | null => {
  let values: unknown;
  try {
    // Preserve settings saved by the original text-input version during upgrades.
    values = rawValue.trim().startsWith('[')
      ? JSON.parse(rawValue)
      : rawValue.split(',');
  } catch {
    return null;
  }
  if (!isArray(values)) return null;
  const days = [...new Set(values.map(parseTwitterTimeframe))];
  if (
    days.length === 0 ||
    days.length > MAX_TWITTER_TIMEFRAMES ||
    days.some((value) => value === null)
  )
    return null;
  return days.filter((value): value is number => value !== null);
};
