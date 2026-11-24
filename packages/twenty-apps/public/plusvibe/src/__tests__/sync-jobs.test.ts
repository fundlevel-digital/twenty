import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const { records, inputs, get, post, patch, enqueueJobs } = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  inputs: new Map<string, unknown>(),
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  enqueueJobs: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  enqueueJobs,
  kv: {
    get: async (key: string) => inputs.get(key),
    set: async (key: string, value: unknown) => {
      inputs.set(key, value);
    },
  },
}));
vi.mock('twenty-client-sdk/rest', async (original) => ({
  ...(await original<typeof import('twenty-client-sdk/rest')>()),
  RestApiClient: class {
    get = get;
    post = post;
    patch = patch;
  },
}));
import { RestApiClientError } from 'twenty-client-sdk/rest';
import {
  getSyncSummary,
  acquireSyncLease,
  releaseSyncLease,
  enqueueSyncTasks,
  syncTaskId,
  syncInputKey,
  wakeSyncWorker,
  type SyncTask,
} from 'src/logic-functions/utils/sync-jobs';
import { recordId } from 'src/logic-functions/utils/record-id';
const CONTROL_ID = recordId('sync-control');
let revision = 0;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-24T00:00:00Z'));
  vi.resetAllMocks();
  records.clear();
  inputs.clear();
  revision = 0;
  get.mockImplementation(
    async (path: string, options?: { query?: { filter?: string } }) => {
      if (path === '/rest/plusvibeSyncJobs') {
        const filter = options?.query?.filter ?? '';
        return {
          data: {
            plusvibeSyncJobs: [...records.values()]
              .filter((record) => filter.includes(String(record.id)))
              .map((record) => ({ ...record })),
          },
        };
      }
      const id = path.split('/').at(-1) ?? '';
      const record = records.get(id);
      if (!record) throw new RestApiClientError('Not found', { status: 404 });
      return { data: { plusvibeSyncJob: { ...record } } };
    },
  );
  post.mockImplementation(
    async (
      path: string,
      body: Record<string, unknown> | Record<string, unknown>[],
    ) => {
      const rows = Array.isArray(body) ? body : [body];
      for (const row of rows) {
        const id = String(row.id);
        if (records.has(id))
          throw new RestApiClientError('Conflict', { status: 409 });
        records.set(id, {
          ...row,
          updatedAt: new Date(Date.now() + ++revision).toISOString(),
        });
      }
      return {};
    },
  );
  patch.mockImplementation(
    async (path: string, fields: Record<string, unknown>) => {
      const filter = decodeURIComponent(path.split('filter=')[1] ?? '');
      const control = records.get(CONTROL_ID);
      const version = filter.match(/updatedAt\[eq\]:"([^"]+)"/)?.[1];
      const owner = filter.match(/leaseOwner\[eq\]:"([^"]+)"/)?.[1];
      if (
        !control ||
        (version && version !== control.updatedAt) ||
        (owner && owner !== control.leaseOwner)
      )
        return { data: { updatePlusvibeSyncJobs: [] } };
      records.set(CONTROL_ID, {
        ...control,
        ...fields,
        updatedAt: new Date(Date.now() + ++revision).toISOString(),
      });
      return { data: { updatePlusvibeSyncJobs: [{ id: CONTROL_ID }] } };
    },
  );
});
afterEach(() => vi.useRealTimers());
describe('Durable sync coordination', () => {
  it('allows exactly one concurrent worker to claim the shared request budget', async () => {
    records.set(CONTROL_ID, {
      id: CONTROL_ID,
      kind: 'CONTROL',
      status: 'COMPLETED',
      updatedAt: new Date().toISOString(),
    });
    const owners = await Promise.all([acquireSyncLease(), acquireSyncLease()]);
    expect(owners.filter(Boolean)).toHaveLength(1);
  });
  it('recovers an expired worker lease and rejects release by the old worker', async () => {
    const original = await acquireSyncLease();
    expect(original).toBeTruthy();
    vi.advanceTimersByTime(360_001);
    const replacement = await acquireSyncLease();
    expect(replacement).toBeTruthy();
    await releaseSyncLease(original!, 0);
    expect(records.get(CONTROL_ID)?.leaseOwner).toBe(replacement);
  });
  it('applies a shared cooldown across otherwise independent workers', async () => {
    const owner = await acquireSyncLease();
    await releaseSyncLease(owner!, 90_000);
    expect(await acquireSyncLease()).toBeUndefined();
    vi.advanceTimersByTime(90_001);
    expect(await acquireSyncLease()).toBeTruthy();
  });
  it('keeps source payloads private and does not reset a completed task on duplicate delivery', async () => {
    const task: SyncTask = {
      kind: 'EMAIL',
      workspaceId: 'workspace-1',
      runId: 'run-1',
      identity: ['message-1'],
      payload: {
        workspaceId: 'workspace-1',
        runId: 'run-1',
        source: { body: 'Private message', email: 'private@example.com' },
      },
    };
    await enqueueSyncTasks([task, task]);
    const id = syncTaskId(task);
    expect(records.size).toBe(1);
    expect(records.get(id)?.payload).toEqual({
      workspaceId: task.workspaceId,
      runId: task.runId,
    });
    expect(inputs.get(syncInputKey(id))).toEqual(task.payload);
    records.set(id, { ...records.get(id)!, status: 'COMPLETED' });
    inputs.delete(syncInputKey(id));
    await enqueueSyncTasks([task]);
    expect(records.get(id)?.status).toBe('COMPLETED');
    expect(inputs.has(syncInputKey(id))).toBe(false);
  });
  it('does not treat a source write rejection as success', async () => {
    post.mockRejectedValue(
      new RestApiClientError('Invalid field', { status: 400 }),
    );
    await expect(
      enqueueSyncTasks([
        {
          kind: 'LEAD',
          workspaceId: 'workspace-1',
          runId: 'run-1',
          identity: ['lead-1'],
          payload: {},
        },
      ]),
    ).rejects.toMatchObject({ status: 400 });
    expect(records.size).toBe(0);
  });
  it('leaves saved tasks recoverable when immediate wake publication fails', async () => {
    enqueueJobs.mockRejectedValue(new Error('Queue unavailable'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(wakeSyncWorker()).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});

describe('Verified source coverage', () => {
  it('counts a flat grouped result with one root resolver', async () => {
    post.mockResolvedValueOnce({
      data: {
        plusvibeSyncJobsGroupBy: [
          { groupByDimensionValues: ['LEAD', 'COMPLETED'], totalCount: '12' },
          { groupByDimensionValues: ['LEAD', 'FAILED'], totalCount: 1 },
          { groupByDimensionValues: ['EMAIL', 'COMPLETED'], totalCount: 5 },
          { groupByDimensionValues: ['EMAIL', 'RETRYING'], totalCount: 2 },
          { groupByDimensionValues: ['IMPORT_PAGE', 'RUNNING'], totalCount: 1 },
        ],
      },
    });
    await expect(getSyncSummary('workspace-1', 'run-1')).resolves.toEqual({
      pending: 3,
      failed: 1,
      completed: 17,
      sourceLeads: 13,
      importedLeads: 12,
      sourceEmails: 7,
      importedEmails: 5,
    });
    const [path, request] = post.mock.calls[0];
    expect(path).toBe('/graphql');
    expect(request.query.match(/plusvibeSyncJobsGroupBy/g)).toHaveLength(1);
    expect(request.variables).toEqual({
      workspace: 'workspace-1',
      run: 'run-1',
    });
  });
  it('rejects an unverified coverage result instead of reporting zero work', async () => {
    post.mockResolvedValueOnce({
      data: { plusvibeSyncJobsGroupBy: { edges: [] } },
    });
    await expect(getSyncSummary('workspace-1', 'run-1')).rejects.toThrow();
  });
});
