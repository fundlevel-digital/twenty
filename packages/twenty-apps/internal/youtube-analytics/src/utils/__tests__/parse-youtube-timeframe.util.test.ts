import { expect, it } from 'vitest';
import { parseYoutubeTimeframe } from 'src/utils/parse-youtube-timeframe.util';
import { parseYoutubeTimeframes } from 'src/utils/parse-youtube-timeframes.util';

it.each([
  ['1', 1],
  ['366', 366],
  [' 30 ', 30],
  ['007', 7],
  [366, 366],
])('accepts whole-number day value %s', (value, expected) => {
  expect(parseYoutubeTimeframe(value)).toBe(expected);
});
it.each([
  '',
  ' ',
  '0',
  '367',
  '-1',
  '1.5',
  'abc',
  '30 days',
  '30,60',
  '0x10',
  '1e2',
  'NaN',
  'Infinity',
  true,
  null,
  undefined,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
])('rejects invalid day value %s', (value) => {
  expect(parseYoutubeTimeframe(value)).toBeNull();
});
it('deduplicates tags by their numeric value', () => {
  expect(parseYoutubeTimeframes('["7","007","366"]')).toEqual([7, 366]);
});
it('accepts the new 366-day maximum and rejects 367 in structured settings', () => {
  expect(parseYoutubeTimeframes('["1","366"]')).toEqual([1, 366]);
  expect(parseYoutubeTimeframes('["367"]')).toBeNull();
});
