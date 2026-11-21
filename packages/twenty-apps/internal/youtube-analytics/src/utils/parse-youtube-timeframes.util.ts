import { isArray } from '@sniptt/guards';

import { MAX_YOUTUBE_TIMEFRAMES } from 'src/constants/youtube-timeframe-limits.constant';
import { parseYoutubeTimeframe } from 'src/utils/parse-youtube-timeframe.util';

export const parseYoutubeTimeframes = (rawValue: string): number[] | null => {
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
  const days = [...new Set(values.map(parseYoutubeTimeframe))];
  if (
    days.length === 0 ||
    days.length > MAX_YOUTUBE_TIMEFRAMES ||
    days.some((value) => value === null)
  )
    return null;
  return days.filter((value): value is number => value !== null);
};
