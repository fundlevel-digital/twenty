import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  acquire,
  release,
  list,
  update,
  process,
  get,
  post,
  enqueueJobs,
  values,
  remove,
} = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  process: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  enqueueJobs: vi.fn(),
  values: new Map<string, unknown>(),
  remove: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  enqueueJobs,
  kv: {
    get: async (key: string) => values.get(key),
    set: async (key: string, value: unknown) => values.set(key, value),
    delete: remove,
  },
}));
vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  acquireSyncLease: acquire,
  releaseSyncLease: release,
  listSyncJobs: list,
  updateSyncJob: update,
  syncInputKey: (id: string) => `input:${id}`,
}));
vi.mock('src/logic-functions/utils/start-import', () => ({
  enqueueImportPage: vi.fn(),
}));
vi.mock('src/logic-functions/utils/process-sync-task', () => ({
  processSyncTask: process,
}));
vi.mock('twenty-client-sdk/rest', async (original) => ({
  ...(await original<typeof import('twenty-client-sdk/rest')>()),
  RestApiClient: class {
    get = get;
    post = post;
  },
}));
import { RestApiClientError } from 'twenty-client-sdk/rest';
import { SyncHttpError } from 'src/logic-functions/utils/sync-context';
import { syncWorkerHandler } from 'src/logic-functions/sync-worker';
import { enqueueImportPage } from 'src/logic-functions/utils/start-import';
import { getImportKey, SELECTION_KEY } from 'src/constants/plusvibe';
const JOB = {
  id: 'job-1',
  kind: 'EMAIL',
  runId: 'run-1',
  sourceWorkspaceId: 'workspace-1',
  attempts: 0,
  payload: { workspaceId: 'workspace-1', runId: 'run-1' },
};
beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  acquire.mockResolvedValue('owner-1');
  list.mockResolvedValue([]);
  post.mockResolvedValue({
    data: { messageChannelMessageAssociations: { totalCount: 1 } },
  });
  get.mockResolvedValue({
    data: { message: { id: 'message-1', plusvibeExternalId: 'source-1' } },
  });
});
describe('Resumable sync worker', () => {
  it('rebuilds a missing page delivery from its saved cursor', async () => {
    values.set(SELECTION_KEY, ['workspace-1']);
    const state = {
      version: 5,
      runId: 'run-1',
      phase: 'leads',
      cursor: 'saved-page',
      processed: 100,
    };
    values.set(getImportKey('workspace-1'), state);
    await syncWorkerHandler();
    expect(enqueueImportPage).toHaveBeenCalledWith('workspace-1', state);
    expect(process).not.toHaveBeenCalled();
  });

  it('does no work while another worker owns the budget', async () => {
    acquire.mockResolvedValue(undefined);
    expect(await syncWorkerHandler()).toEqual({ busy: true });
    expect(list).not.toHaveBeenCalled();
  });
  it('pauses and persists throttled work even after many prior retries', async () => {
    list.mockResolvedValueOnce([{ ...JOB, attempts: 100 }]);
    process.mockRejectedValue(new SyncHttpError(429, 120_000));
    const result = await syncWorkerHandler();
    expect(update).toHaveBeenLastCalledWith(
      JOB.id,
      expect.objectContaining({
        status: 'RETRYING',
        diagnostic: expect.objectContaining({ status: 429, retryable: true }),
      }),
    );
    expect(release).toHaveBeenCalledWith('owner-1', expect.any(Number));
    expect(result.cooldownMilliseconds).toBeGreaterThanOrEqual(120_000);
    expect(remove).not.toHaveBeenCalled();
  });
  it('isolates a rejected record and still imports the next record', async () => {
    list
      .mockResolvedValueOnce([JOB])
      .mockResolvedValueOnce([{ ...JOB, id: 'job-2' }])
      .mockResolvedValueOnce([]);
    process
      .mockRejectedValueOnce(
        new RestApiClientError('Invalid field', {
          status: 400,
          body: { errors: [{ property: 'campaignStatus' }] },
        }),
      )
      .mockResolvedValueOnce({
        object: 'messages',
        workspaceId: 'workspace-1',
        id: 'message-1',
        externalId: 'source-1',
      });
    expect(await syncWorkerHandler()).toMatchObject({ completed: 1 });
    expect(update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: 'FAILED',
        diagnostic: expect.objectContaining({
          status: 400,
          fields: ['campaignStatus'],
        }),
      }),
    );
    expect(update).toHaveBeenCalledWith(
      'job-2',
      expect.objectContaining({
        status: 'COMPLETED',
        verifiedAt: expect.any(String),
        resultRecordId: 'message-1',
      }),
    );
    expect(remove).toHaveBeenCalledWith('input:job-2');
  });
  it('does not report completion when the stored source identity is wrong', async () => {
    post.mockResolvedValueOnce({
      data: { messageChannelMessageAssociations: { totalCount: 0 } },
    });
    list.mockResolvedValueOnce([JOB]);
    process.mockResolvedValue({
      object: 'messages',
      workspaceId: 'workspace-1',
      id: 'message-1',
      externalId: 'other-source',
    });
    expect(await syncWorkerHandler()).toMatchObject({ completed: 0 });
    expect(update).toHaveBeenLastCalledWith(
      'job-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
    expect(remove).not.toHaveBeenCalled();
  });
  it('replays an interrupted running task without depending on the old queue delivery', async () => {
    list.mockResolvedValueOnce([
      { ...JOB, status: 'RUNNING', leaseExpiresAt: '2026-01-01T00:00:00Z' },
    ]);
    process.mockResolvedValue({
      object: 'messages',
      workspaceId: 'workspace-1',
      id: 'message-1',
      externalId: 'source-1',
    });
    expect(await syncWorkerHandler()).toMatchObject({ completed: 1 });
    expect(list.mock.calls[0][0]).toContain('leaseExpiresAt[lte]');
    expect(update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: 'COMPLETED' }),
    );
  });
  it('releases the lease when queue storage fails during processing', async () => {
    list.mockRejectedValue(new SyncHttpError(503));
    await expect(syncWorkerHandler()).rejects.toMatchObject({ status: 503 });
    expect(release).toHaveBeenCalledWith('owner-1', 0);
  });
});
