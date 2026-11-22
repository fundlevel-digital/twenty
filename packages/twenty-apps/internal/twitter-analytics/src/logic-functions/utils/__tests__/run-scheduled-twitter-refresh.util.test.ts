import { describe, expect, it, vi } from 'vitest';
import { runScheduledTwitterRefresh } from 'src/logic-functions/utils/run-scheduled-twitter-refresh.util';
import {
  getTwitterRefreshSchedule,
  getTwitterScheduleSignature,
} from 'src/utils/twitter-refresh-schedule.util';

const schedule = getTwitterRefreshSchedule({});
const previous = (slot: string) =>
  JSON.stringify({
    configuration: getTwitterScheduleSignature(schedule),
    slot,
  });

describe('scheduled Twitter refresh dispatch', () => {
  it('does no API or metadata work while off', async () => {
    const refresh = vi.fn(),
      saveSlot = vi.fn();
    expect(
      await runScheduledTwitterRefresh({
        schedule: { ...schedule, frequency: 'OFF' },
        refresh,
        saveSlot,
      }),
    ).toMatchObject({ reason: 'disabled' });
    expect(refresh).not.toHaveBeenCalled();
    expect(saveSlot).not.toHaveBeenCalled();
  });
  it('initializes a new schedule without starting a historical batch', async () => {
    const refresh = vi.fn(),
      saveSlot = vi.fn();
    expect(
      await runScheduledTwitterRefresh({
        schedule,
        previous: '',
        now: new Date('2026-11-22T12:00:00Z'),
        refresh,
        saveSlot,
      }),
    ).toMatchObject({ reason: 'schedule-initialized' });
    expect(saveSlot).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });
  it('runs an established due window even when the queue delivers it late', async () => {
    const refresh = vi.fn().mockResolvedValue('refreshed'),
      saveSlot = vi.fn();
    const result = await runScheduledTwitterRefresh({
      schedule,
      previous: previous('2026-11-21T05:00:00Z'),
      now: new Date('2026-11-22T05:08:00Z'),
      refresh,
      saveSlot,
    });
    expect(result).toBe('refreshed');
    expect(saveSlot.mock.invocationCallOrder[0]).toBeLessThan(
      refresh.mock.invocationCallOrder[0],
    );
  });
  it('does not restart a claimed window on later minute ticks', async () => {
    const refresh = vi.fn(),
      saveSlot = vi.fn();
    await runScheduledTwitterRefresh({
      schedule,
      previous: previous('2026-11-22T05:00:00Z'),
      now: new Date('2026-11-22T05:09:00Z'),
      refresh,
      saveSlot,
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(saveSlot).not.toHaveBeenCalled();
  });
  it('does not start API work if recording the window fails', async () => {
    const refresh = vi.fn(),
      saveSlot = vi.fn().mockRejectedValue(new Error('Metadata unavailable'));
    await expect(
      runScheduledTwitterRefresh({
        schedule,
        previous: '',
        now: new Date('2026-11-22T05:00:00Z'),
        refresh,
        saveSlot,
      }),
    ).rejects.toThrow('Metadata unavailable');
    expect(refresh).not.toHaveBeenCalled();
  });
  it('reinitializes a changed frequency without running immediately', async () => {
    const refresh = vi.fn(),
      saveSlot = vi.fn();
    expect(
      await runScheduledTwitterRefresh({
        schedule: { ...schedule, frequency: 'WEEKLY' },
        previous: previous('2026-11-22T05:00:00Z'),
        now: new Date('2026-11-22T12:00:00Z'),
        refresh,
        saveSlot,
      }),
    ).toMatchObject({ reason: 'schedule-initialized' });
    expect(refresh).not.toHaveBeenCalled();
  });
});
