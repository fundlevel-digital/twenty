import { expect, it } from 'vitest';
import { parseTwitterTimeframe } from 'src/utils/parse-twitter-timeframe.util';
import { parseTwitterTimeframes } from 'src/utils/parse-twitter-timeframes.util';

it.each([
  ['1', 1],
  ['366', 366],
  [' 30 ', 30],
  ['007', 7],
  [366, 366],
])('accepts whole-number day value %s', (value, expected) => {
  expect(parseTwitterTimeframe(value)).toBe(expected);
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
  expect(parseTwitterTimeframe(value)).toBeNull();
});
it('deduplicates tags by their numeric value', () => {
  expect(parseTwitterTimeframes('["7","007","366"]')).toEqual([7, 366]);
});
it('accepts the new 366-day maximum and rejects 367 in structured settings', () => {
  expect(parseTwitterTimeframes('["1","366"]')).toEqual([1, 366]);
  expect(parseTwitterTimeframes('["367"]')).toBeNull();
});
