export type TwitterRefreshFrequency = 'OFF' | 'HOURLY' | 'DAILY' | 'WEEKLY';
export type TwitterRefreshSchedule = {
  frequency: TwitterRefreshFrequency;
  hour: number;
  minute: number;
  weekday: number;
};

export const isTwitterRefreshFrequency = (
  value: string,
): value is TwitterRefreshFrequency =>
  ['OFF', 'HOURLY', 'DAILY', 'WEEKLY'].includes(value);

export const getTwitterRefreshSchedule = (
  variables: Record<string, string | undefined>,
): TwitterRefreshSchedule => {
  const frequency = variables.REFRESH_SCHEDULE_FREQUENCY ?? 'DAILY';
  if (!isTwitterRefreshFrequency(frequency))
    throw new Error('Invalid scheduled refresh frequency');
  const number = (key: string, fallback: number, maximum: number) => {
    const value = variables[key] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) > maximum)
      throw new Error(`Invalid ${key}`);
    return Number(value);
  };
  return {
    frequency,
    hour: number('REFRESH_SCHEDULE_HOUR', 5, 23),
    minute: number('REFRESH_SCHEDULE_MINUTE', 0, 59),
    weekday: number('REFRESH_SCHEDULE_WEEKDAY', 1, 6),
  };
};

export const getLatestTwitterRefreshSlot = (
  schedule: TwitterRefreshSchedule,
  now: Date,
): Date | null => {
  if (schedule.frequency === 'OFF') return null;
  const slot = new Date(now);
  slot.setUTCHours(
    schedule.frequency === 'HOURLY' ? now.getUTCHours() : schedule.hour,
    schedule.minute,
    0,
    0,
  );
  if (schedule.frequency === 'WEEKLY')
    slot.setUTCDate(
      slot.getUTCDate() - ((slot.getUTCDay() - schedule.weekday + 7) % 7),
    );
  if (slot > now) {
    if (schedule.frequency === 'HOURLY')
      slot.setUTCHours(slot.getUTCHours() - 1);
    else
      slot.setUTCDate(
        slot.getUTCDate() - (schedule.frequency === 'WEEKLY' ? 7 : 1),
      );
  }
  return slot;
};

export const getTwitterScheduleSignature = (schedule: TwitterRefreshSchedule) =>
  JSON.stringify([
    schedule.frequency,
    schedule.frequency === 'HOURLY' ? null : schedule.hour,
    schedule.minute,
    schedule.frequency === 'WEEKLY' ? schedule.weekday : null,
  ]);
