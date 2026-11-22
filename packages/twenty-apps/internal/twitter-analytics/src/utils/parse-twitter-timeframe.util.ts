import { isNumber, isString } from '@sniptt/guards';

import {
  MIN_TWITTER_TIMEFRAME_DAYS,
  MAX_TWITTER_TIMEFRAME_DAYS,
} from 'src/constants/twitter-timeframe-limits.constant';

export const parseTwitterTimeframe = (value: unknown): number | null => {
  if (!isNumber(value) && (!isString(value) || !/^\d+$/.test(value.trim()))) {
    return null;
  }
  const days = Number(value);
  return Number.isInteger(days) &&
    days >= MIN_TWITTER_TIMEFRAME_DAYS &&
    days <= MAX_TWITTER_TIMEFRAME_DAYS
    ? days
    : null;
};
