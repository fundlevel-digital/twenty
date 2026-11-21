import { afterEach, describe, expect, it, vi } from 'vitest';
import { getYoutubeSyncOptions } from 'src/logic-functions/utils/get-youtube-sync-options.util';

afterEach(() => vi.unstubAllEnvs());

describe('getYoutubeSyncOptions', () => {
  it('defaults to 12 recent videos', () => {
    vi.stubEnv('RECENT_VIDEO_COUNT', undefined);
    expect(getYoutubeSyncOptions().lookback).toBe(12);
  });
  it.each(['2', '30', ' 20 '])('accepts %s', (value) => {
    vi.stubEnv('RECENT_VIDEO_COUNT', value);
    expect(getYoutubeSyncOptions().lookback).toBe(Number(value));
  });
  it.each(['1', '31', '2.5', '', 'not-a-number', 'Infinity'])(
    'rejects %s',
    (value) => {
      vi.stubEnv('RECENT_VIDEO_COUNT', value);
      expect(() => getYoutubeSyncOptions()).toThrow(
        'RECENT_VIDEO_COUNT must be a whole number from 2 to 30',
      );
    },
  );
});

it('supports independent multiple day windows and deduplicates them', () => {
  vi.stubEnv('NUMBER_TIMEFRAME_DAYS', '1, 7,366,7');
  vi.stubEnv('PERCENTAGE_TIMEFRAME_DAYS', '30,90');
  expect(getYoutubeSyncOptions()).toMatchObject({
    numberTimeframeDays: [1, 7, 366],
    percentageTimeframeDays: [30, 90],
    timeframeDays: [1, 7, 366, 30, 90],
    metricFormat: 'BOTH',
  });
});
it.each(['0', '367', '1.5', '', '1,,7', 'a', '1,2,3,4,5,6,7,8,9,10,11'])(
  'rejects invalid day configuration %s',
  (value) => {
    vi.stubEnv('NUMBER_TIMEFRAME_DAYS', value);
    expect(() => getYoutubeSyncOptions()).toThrow('NUMBER_TIMEFRAME_DAYS');
  },
);
it.each(['NUMBERS', 'PERCENTAGES', 'BOTH'])(
  'accepts metric format %s',
  (value) => {
    vi.stubEnv('METRIC_FORMAT', value);
    expect(getYoutubeSyncOptions().metricFormat).toBe(value);
  },
);
it('rejects unknown metric formats', () => {
  vi.stubEnv('METRIC_FORMAT', 'INVALID');
  expect(() => getYoutubeSyncOptions()).toThrow('METRIC_FORMAT');
});

it('reads native multi-select values and keeps count and percentage windows independent', () => {
  vi.stubEnv('NUMBER_TIMEFRAME_DAYS', '["1","7","366","7"]');
  vi.stubEnv('PERCENTAGE_TIMEFRAME_DAYS', '["30","90"]');
  expect(getYoutubeSyncOptions()).toMatchObject({
    numberTimeframeDays: [1, 7, 366],
    percentageTimeframeDays: [30, 90],
  });
});
it.each([
  '[]',
  '["0"]',
  '["367"]',
  '["1.5"]',
  '[true]',
  '[null]',
  '[["7"]]',
  '["7",',
  '["a"]',
])('rejects invalid multi-select values %s', (value) => {
  vi.stubEnv('NUMBER_TIMEFRAME_DAYS', value);
  expect(() => getYoutubeSyncOptions()).toThrow('NUMBER_TIMEFRAME_DAYS');
});
