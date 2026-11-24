import { beforeEach, describe, expect, it, vi } from 'vitest';
const {
  values,
  plusvibeRequest,
  enqueueSyncTasks,
  enqueueImportPage,
  wakeSyncWorker,
  findMailConnection,
} = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  plusvibeRequest: vi.fn(),
  enqueueSyncTasks: vi.fn(),
  enqueueImportPage: vi.fn(),
  wakeSyncWorker: vi.fn(),
  findMailConnection: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: vi.fn(async (key: string) => values.get(key)),
    set: vi.fn(async (key: string, value: unknown) => values.set(key, value)),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  plusvibeRequest,
  getApiKeyFingerprint: async () => 'fingerprint',
}));
vi.mock('src/logic-functions/utils/sync-jobs', () => ({
  enqueueSyncTasks,
  wakeSyncWorker,
}));
vi.mock('src/logic-functions/utils/start-import', () => ({
  enqueueImportPage,
}));
vi.mock('src/logic-functions/utils/native-email', () => ({
  findMailConnection,
}));
import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
import {
  backfillHandler,
  processImportPage,
} from 'src/logic-functions/backfill';
const INPUT = {
  workspaceId: 'workspace-1',
  runId: 'run-1',
  phase: 'leads',
  cursor: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  values.set(SELECTION_KEY, [INPUT.workspaceId]);
  values.set(getRegistrationKey(INPUT.workspaceId), {
    workspaceName: 'Sales',
    apiKeyFingerprint: 'fingerprint',
  });
  values.set(getImportKey(INPUT.workspaceId), {
    version: 5,
    runId: INPUT.runId,
    phase: 'leads',
    processed: 0,
  });
  findMailConnection.mockResolvedValue({ id: 'mail' });
});
describe('Durable provider discovery', () => {
  it('saves every source row, including invalid rows, before advancing discovery', async () => {
    const sources = [
      { _id: 'valid', email: 'lead@example.com' },
      { _id: 'invalid', email: 'bad-email' },
    ];
    plusvibeRequest.mockResolvedValue({
      data: sources,
      has_more: true,
      next_starting_after: 'next',
    });
    await processImportPage(INPUT);
    expect(enqueueSyncTasks).toHaveBeenCalledWith(
      sources.map((source) =>
        expect.objectContaining({
          kind: 'LEAD',
          identity: ['leads', source._id],
          payload: expect.objectContaining({ source }),
        }),
      ),
    );
    expect(values.get(getImportKey(INPUT.workspaceId))).toMatchObject({
      processed: 2,
      cursor: 'next',
    });
  });
  it('retains the cursor when saving source records fails', async () => {
    plusvibeRequest.mockResolvedValue({
      data: [{ _id: 'lead-1' }],
      has_more: true,
      next_starting_after: 'next',
    });
    enqueueSyncTasks.mockRejectedValue(new Error('Storage unavailable'));
    await expect(processImportPage(INPUT)).rejects.toThrow(
      'Storage unavailable',
    );
    expect(values.get(getImportKey(INPUT.workspaceId))).toMatchObject({
      processed: 0,
    });
    expect(enqueueImportPage).not.toHaveBeenCalled();
  });
  it('recovers publication interrupted after checkpoint advancement without fetching the old page again', async () => {
    plusvibeRequest.mockResolvedValue({
      data: [],
      has_more: true,
      next_starting_after: 'next',
    });
    enqueueImportPage.mockRejectedValueOnce(new Error('Queue unavailable'));
    await expect(processImportPage(INPUT)).rejects.toThrow('Queue unavailable');
    expect(await processImportPage(INPUT)).toEqual({ skipped: true });
    expect(plusvibeRequest).toHaveBeenCalledOnce();
    expect(enqueueImportPage).toHaveBeenLastCalledWith(
      INPUT.workspaceId,
      expect.objectContaining({ cursor: 'next' }),
    );
  });
  it('discovers all four phases without claiming the separately queued records are imported', async () => {
    for (const [phase, next] of [
      ['campaigns', 'leads'],
      ['leads', 'emails'],
      ['emails', 'archivedEmails'],
      ['archivedEmails', 'complete'],
    ]) {
      values.set(getImportKey(INPUT.workspaceId), {
        version: 5,
        runId: INPUT.runId,
        phase,
        processed: 0,
      });
      plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: false });
      await processImportPage({ ...INPUT, phase });
      expect(values.get(getImportKey(INPUT.workspaceId))).toMatchObject({
        phase: next,
      });
    }
  });
  it('rejects a non-advancing cursor before saving any work', async () => {
    plusvibeRequest.mockResolvedValue({ data: [], has_more: true });
    await expect(processImportPage(INPUT)).rejects.toThrow('pagination');
    expect(enqueueSyncTasks).not.toHaveBeenCalled();
  });
  it('does not fetch records for superseded or deselected runs', async () => {
    await processImportPage({ ...INPUT, runId: 'old' });
    values.set(SELECTION_KEY, []);
    await processImportPage(INPUT);
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });
  it('persists legacy queued deliveries instead of starting concurrent imports', async () => {
    expect(await backfillHandler(INPUT)).toEqual({ queued: true });
    expect(enqueueSyncTasks).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'IMPORT_PAGE', payload: INPUT }),
    ]);
    expect(wakeSyncWorker).toHaveBeenCalledOnce();
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });
});
