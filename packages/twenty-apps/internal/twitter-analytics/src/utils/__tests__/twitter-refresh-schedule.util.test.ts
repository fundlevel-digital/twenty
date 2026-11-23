import { describe, expect, it } from 'vitest';
import {
  getLatestTwitterRefreshSlot,
  getTwitterRefreshSchedule,
} from 'src/utils/twitter-refresh-schedule.util';

describe('Twitter refresh schedules', () => {
  it('preserves the legacy daily 05:00 UTC default', () => {
    expect(getTwitterRefreshSchedule({})).toEqual({
      frequency: 'DAILY',
      hour: 5,
      minute: 0,
      weekday: 1,
    });
  });
  it.each([
    ['REFRESH_SCHEDULE_FREQUENCY', 'MINUTELY'],
    ['REFRESH_SCHEDULE_HOUR', '24'],
    ['REFRESH_SCHEDULE_MINUTE', '60'],
    ['REFRESH_SCHEDULE_WEEKDAY', '7'],
    ['REFRESH_SCHEDULE_HOUR', '-1'],
    ['REFRESH_SCHEDULE_MINUTE', '1.5'],
  ])('rejects an invalid %s', (key, value) => {
    expect(() => getTwitterRefreshSchedule({ [key]: value })).toThrow(
      'Invalid',
    );
  });
  it.each([
    ['HOURLY', '2026-11-22T00:10:00Z', '2026-11-21T23:30:00.000Z'],
    ['DAILY', '2027-01-01T04:59:00Z', '2026-12-31T05:30:00.000Z'],
    ['DAILY', '2027-01-01T05:31:00Z', '2027-01-01T05:30:00.000Z'],
    ['WEEKLY', '2026-11-23T02:00:00Z', '2026-11-16T05:30:00.000Z'],
    ['WEEKLY', '2026-11-23T06:00:00Z', '2026-11-23T05:30:00.000Z'],
  ])('finds the latest %s window at %s in UTC', (frequency, now, expected) => {
    const schedule = getTwitterRefreshSchedule({
      REFRESH_SCHEDULE_FREQUENCY: frequency,
      REFRESH_SCHEDULE_MINUTE: '30',
    });
    expect(
      getLatestTwitterRefreshSlot(schedule, new Date(now))?.toISOString(),
    ).toBe(expected);
  });
  it('does not select a window while off', () => {
    expect(
      getLatestTwitterRefreshSlot(
        { ...getTwitterRefreshSchedule({}), frequency: 'OFF' },
        new Date(),
      ),
    ).toBeNull();
  });
});
