import { beforeEach, describe, expect, it, vi } from 'vitest';
const { values, enqueueSyncTasks, wakeSyncWorker, getSyncSummary } = vi.hoisted(
  () => ({
    values: new Map<string, unknown>(),
    enqueueSyncTasks: vi.fn(),
    wakeSyncWorker: vi.fn(),
    getSyncSummary: vi.fn(),
  }),
);
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: async (key: string) => values.get(key),
    set: async (key: string, value: unknown) => values.set(key, value),
    delete: async (key: string) => values.delete(key),
  },
}));
vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  enqueueSyncTasks,
  wakeSyncWorker,
  getSyncSummary,
}));
import { getImportKey } from 'src/constants/plusvibe';
import { startImport } from 'src/logic-functions/utils/start-import';
const KEY = getImportKey('workspace-1');
beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  getSyncSummary.mockResolvedValue({ pending: 0, failed: 0 });
});
describe('Stable import runs', () => {
  it('keeps an old active run and its cursor instead of silently restarting it', async () => {
    values.set(KEY, {
      version: 5,
      runId: 'old-active-run',
      phase: 'leads',
      cursor: 'saved-page',
      processed: 100,
      updatedAt: '2020-01-01T00:00:00Z',
    });
    await startImport('workspace-1');
    expect(values.get(KEY)).toMatchObject({
      runId: 'old-active-run',
      cursor: 'saved-page',
    });
    expect(enqueueSyncTasks).toHaveBeenCalledWith([
      expect.objectContaining({
        payload: expect.objectContaining({
          runId: 'old-active-run',
          cursor: 'saved-page',
        }),
      }),
    ]);
  });
  it('does not replace a discovered run while email history remains pending', async () => {
    values.set(KEY, {
      version: 5,
      runId: 'run-1',
      phase: 'complete',
      processed: 100,
    });
    getSyncSummary.mockResolvedValue({ pending: 10, failed: 0 });
    await startImport('workspace-1');
    expect(values.get(KEY)).toMatchObject({ runId: 'run-1' });
    expect(enqueueSyncTasks).not.toHaveBeenCalled();
    expect(wakeSyncWorker).toHaveBeenCalled();
  });
  it('upgrades an old partial pipeline through full source discovery', async () => {
    values.set(KEY, {
      version: 4,
      runId: 'old',
      phase: 'emails',
      processed: 100,
    });
    await startImport('workspace-1');
    expect(values.get(KEY)).toMatchObject({
      version: 5,
      phase: 'campaigns',
      processed: 0,
    });
    expect(values.get(KEY)).not.toMatchObject({ runId: 'old' });
  });
  it('keeps the initial checkpoint recoverable when task publication fails', async () => {
    enqueueSyncTasks.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(startImport('workspace-1')).rejects.toThrow(
      'Storage unavailable',
    );
    expect(values.get(KEY)).toMatchObject({
      version: 5,
      phase: 'campaigns',
      processed: 0,
    });
    await startImport('workspace-1');
    expect(enqueueSyncTasks).toHaveBeenCalledTimes(2);
  });
});
