vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  retryFailedSyncJobs: vi.fn(),
  enqueueSyncTasks,
  wakeSyncWorker,
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, enqueueJobs, enqueueSyncTasks, wakeSyncWorker } = vi.hoisted(
  () => ({
    values: new Map<string, unknown>(),
    enqueueJobs: vi.fn(),
    enqueueSyncTasks: vi.fn(),
    wakeSyncWorker: vi.fn(),
  }),
);

vi.mock('twenty-sdk/logic-function', () => ({
  enqueueJobs,
  getJobs: vi.fn(),
  kv: {
    get: vi.fn(async (key: string) => values.get(key)),
    set: vi.fn(async (key: string, value: unknown) => values.set(key, value)),
    delete: vi.fn(async (key: string) => values.delete(key)),
  },
}));
vi.mock('src/logic-functions/utils/require-application-manager', () => ({
  canManageApplication: vi.fn(async () => true),
}));
vi.mock('src/logic-functions/lead-emails', () => ({
  enqueueLeadEmails: vi.fn(),
}));
vi.mock('src/logic-functions/utils/native-email', () => ({
  prepareNativeEmailChannel: vi.fn(),
  prepareUnresolvedHistoryChannel: vi.fn(),
  syncNativeEmail: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson: vi.fn(),
}));

import { getImportKey, SELECTION_KEY } from 'src/constants/plusvibe';
import { repairPageHandler } from 'src/logic-functions/repair-page';

const INPUT = {
  workspaceId: 'workspace-1',
  expectedRunId: 'run-1',
  operation: 'retry-history-page',
};
const FAILED_STATE = {
  version: 4,
  runId: 'run-1',
  phase: 'failed',
  failedPhase: 'emails',
  cursor: 'page-2',
  processed: 100,
  error: 'Rate limited',
  updatedAt: '2026-11-24T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  enqueueJobs.mockResolvedValue({ enqueued: true });
  values.set(SELECTION_KEY, [INPUT.workspaceId]);
  values.set(getImportKey(INPUT.workspaceId), FAILED_STATE);
});

describe('Retrying a failed history page', () => {
  it('preserves the run and cursor so scheduled campaign jobs remain valid', async () => {
    const state = await repairPageHandler(INPUT);
    expect(state).toMatchObject({
      runId: 'run-1',
      phase: 'emails',
      cursor: 'page-2',
      processed: 100,
      failedPhase: undefined,
      error: undefined,
    });
    expect(
      values.get(`${getImportKey(INPUT.workspaceId)}:before-page-retry:run-1`),
    ).toEqual(FAILED_STATE);
    expect(enqueueSyncTasks).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'IMPORT_PAGE',
        identity: ['emails', 'page-2'],
        payload: {
          workspaceId: INPUT.workspaceId,
          runId: 'run-1',
          phase: 'emails',
          cursor: 'page-2',
        },
      }),
    ]);
  });

  it('rejects a superseded run without changing its checkpoint', async () => {
    await expect(
      repairPageHandler({ ...INPUT, expectedRunId: 'old-run' }),
    ).rejects.toThrow('Import run changed');
    expect(values.get(getImportKey(INPUT.workspaceId))).toEqual(FAILED_STATE);
    expect(enqueueJobs).not.toHaveBeenCalled();
  });

  it('preserves the failed checkpoint when scheduling fails', async () => {
    enqueueSyncTasks.mockRejectedValueOnce(new Error('Queue unavailable'));
    await expect(repairPageHandler(INPUT)).rejects.toThrow('Queue unavailable');
    expect(values.get(getImportKey(INPUT.workspaceId))).toEqual(FAILED_STATE);
  });

  it.each(['leads', 'campaigns', undefined])(
    'rejects failures outside history: %s',
    async (failedPhase) => {
      const state = { ...FAILED_STATE, failedPhase };
      values.set(getImportKey(INPUT.workspaceId), state);
      await expect(repairPageHandler(INPUT)).rejects.toThrow(
        'Only a failed history page can be retried',
      );
      expect(values.get(getImportKey(INPUT.workspaceId))).toEqual(state);
      expect(enqueueJobs).not.toHaveBeenCalled();
    },
  );
});
