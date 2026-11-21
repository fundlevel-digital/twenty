import { isNumber, isString } from '@sniptt/guards';

import {
  MIN_YOUTUBE_TIMEFRAME_DAYS,
  MAX_YOUTUBE_TIMEFRAME_DAYS,
} from 'src/constants/youtube-timeframe-limits.constant';

export const parseYoutubeTimeframe = (value: unknown): number | null => {
  if (!isNumber(value) && (!isString(value) || !/^\d+$/.test(value.trim()))) {
    return null;
  }
  const days = Number(value);
  return Number.isInteger(days) &&
    days >= MIN_YOUTUBE_TIMEFRAME_DAYS &&
    days <= MAX_YOUTUBE_TIMEFRAME_DAYS
    ? days
    : null;
};
