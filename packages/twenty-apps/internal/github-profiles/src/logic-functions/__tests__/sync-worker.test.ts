import { beforeEach, describe, expect, it, vi } from 'vitest';
import { githubSyncWorker } from 'src/logic-functions/sync-worker';
import { GithubRateLimitError } from 'src/logic-functions/utils/github-client';
import { DEFAULT_SYNC_SETTINGS } from 'src/types/sync-settings';
import { type BackfillPlan } from 'src/logic-functions/utils/backfill';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  queue: vi.fn(),
  sync: vi.fn(),
  scan: vi.fn(),
}));
vi.mock('src/logic-functions/utils/source-sync', () => ({
  syncSourceRecord: mocks.sync,
}));
vi.mock('src/logic-functions/utils/backfill', () => ({
  loadBackfill: mocks.load,
  saveBackfill: mocks.save,
  scanBackfillPage: mocks.scan,
  queueSyncJob: mocks.queue,
  backfillSummary: (plan: BackfillPlan) => plan,
}));
const ID = '00000000-0000-4000-8000-000000000001';
const context = {
  retryCount: 0,
  maxRetries: 3,
  workspaceId: ID,
  userWorkspaceId: ID,
  workspaceMemberId: ID,
};
const plan = (): BackfillPlan => ({
  id: ID,
  sourceType: 'person',
  mode: 'LINK_ONLY',
  signature: JSON.stringify(DEFAULT_SYNC_SETTINGS.person),
  status: 'RUNNING',
  scanLimit: 500,
  cursor: null,
  records: [{ id: ID, logins: ['demo'] }],
  next: 0,
  linked: 0,
  removed: 0,
  invalid: 0,
  failed: 0,
  scanned: 1,
  estimatedRequests: 0,
  truncated: false,
  createdAt: '2026-11-22T00:00:00Z',
  updatedAt: '2026-11-22T00:00:00Z',
});
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SYNC_SETTINGS;
});
describe('checkpointed GitHub sync jobs', () => {
  it('keeps scanning all records across pages without fetching GitHub', async () => {
    const scanning = {
      ...plan(),
      status: 'SCANNING' as const,
      scanLimit: null,
    };
    mocks.load.mockResolvedValue(scanning);
    mocks.scan.mockResolvedValue({ ...scanning, scanned: 100, cursor: 'next' });
    await githubSyncWorker({ backfillId: ID }, context);
    expect(mocks.queue).toHaveBeenCalledWith({ backfillId: ID }, 250);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('finishes a preview without automatically starting the backfill', async () => {
    mocks.load.mockResolvedValue({ ...plan(), status: 'SCANNING' });
    mocks.scan.mockResolvedValue({ ...plan(), status: 'PLANNED' });
    await githubSyncWorker({ backfillId: ID }, context);
    expect(mocks.queue).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('does not process paused or cancelled backfills', async () => {
    mocks.load.mockResolvedValue({ ...plan(), status: 'PAUSED' });
    expect(await githubSyncWorker({ backfillId: ID }, context)).toEqual({
      skipped: true,
    });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('pauses if settings have changed since the plan', async () => {
    const current = { ...plan(), signature: 'old' };
    mocks.load.mockResolvedValue(current);
    await githubSyncWorker({ backfillId: ID }, context);
    expect(current.status).toBe('PAUSED');
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it('completes and checkpoints a successful page', async () => {
    const current = plan();
    mocks.load.mockResolvedValue(current);
    mocks.sync.mockResolvedValue({
      linked: 2,
      removed: 0,
      status: 'SYNCED',
      invalid: 0,
    });
    const result = await githubSyncWorker({ backfillId: ID }, context);
    expect(result).toMatchObject({ status: 'COMPLETED', next: 1, linked: 2 });
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('preserves a pause requested during an active record sync', async () => {
    const original = plan();
    const paused = { ...original, status: 'PAUSED' as const };
    mocks.load.mockResolvedValueOnce(original).mockResolvedValueOnce(paused);
    mocks.sync.mockResolvedValue({ linked: 1, removed: 0 });
    await githubSyncWorker({ backfillId: ID }, context);
    expect(paused.status).toBe('PAUSED');
    expect(paused.next).toBe(1);
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('defers primary quota failures without advancing the checkpoint', async () => {
    const current = plan();
    const retryAt = Date.now() + 3600000;
    mocks.load.mockResolvedValue(current);
    mocks.sync.mockRejectedValue(new GithubRateLimitError(retryAt, 'primary'));
    await githubSyncWorker({ backfillId: ID }, context);
    expect(current.next).toBe(0);
    expect(current.retryAt).toBe(retryAt);
    expect(mocks.queue).toHaveBeenCalledWith(
      { backfillId: ID },
      expect.any(Number),
    );
    expect(mocks.queue.mock.calls[0][1]).toBeGreaterThan(3500000);
  });
  it('defers secondary throttles instead of immediately retrying', async () => {
    const retryAt = Date.now() + 120000;
    mocks.sync.mockRejectedValue(
      new GithubRateLimitError(retryAt, 'secondary'),
    );
    await githubSyncWorker(
      { sourceType: 'person', recordId: ID, automatic: true },
      context,
    );
    expect(mocks.queue).toHaveBeenCalledWith(
      expect.objectContaining({ deferrals: 1 }),
      expect.any(Number),
    );
  });
  it('stops after the bounded automatic deferral limit', async () => {
    mocks.sync.mockRejectedValue(
      new GithubRateLimitError(Date.now() + 3600000, 'primary'),
    );
    await expect(
      githubSyncWorker(
        { sourceType: 'person', recordId: ID, deferrals: 24 },
        context,
      ),
    ).rejects.toBeInstanceOf(GithubRateLimitError);
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('marks a backfill failed after exhausting transient retries', async () => {
    const current = plan();
    mocks.load.mockResolvedValue(current);
    mocks.sync.mockRejectedValue(new Error('Unavailable'));
    await expect(
      githubSyncWorker({ backfillId: ID }, { ...context, retryCount: 3 }),
    ).rejects.toThrow('Unavailable');
    expect(current.status).toBe('FAILED');
    expect(current.next).toBe(0);
  });
});
