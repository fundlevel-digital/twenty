import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  scanBackfillPage,
  type BackfillPlan,
} from 'src/logic-functions/utils/backfill';
import { DEFAULT_SYNC_SETTINGS } from 'src/types/sync-settings';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  request: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set },
  enqueueJobs: vi.fn(),
}));
vi.mock('src/logic-functions/utils/workspace-client', () => ({
  createWorkspaceClient: () => ({ request: mocks.request }),
}));
vi.mock('src/logic-functions/utils/source-fields', () => ({
  listSourceFields: async () => [
    {
      universalIdentifier: 'eab908ff-2dd6-4216-b341-8198a56fc8e1',
      name: 'github',
    },
  ],
  sourceSelection: () => 'id github',
  extractGithubLogins: (value: unknown) => ({
    logins: typeof value === 'string' ? [value] : [],
    invalid: 0,
  }),
}));
const plan = (): BackfillPlan => ({
  id: 'demo',
  sourceType: 'person',
  mode: 'LINK_ONLY',
  signature: JSON.stringify(DEFAULT_SYNC_SETTINGS.person),
  status: 'SCANNING',
  scanLimit: null,
  cursor: 'page-50',
  previewComplete: false,
  records: [],
  next: 0,
  linked: 0,
  removed: 0,
  invalid: 0,
  scanned: 5000,
  failed: 0,
  estimatedRequests: 0,
  truncated: false,
  createdAt: '2026-11-22',
  updatedAt: '2026-11-22',
});
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SYNC_SETTINGS;
});
describe('paged backfill previews', () => {
  it('continues beyond 5,000 records when All Records is selected', async () => {
    const current = plan();
    mocks.get.mockResolvedValue(structuredClone(current));
    mocks.request.mockResolvedValue({
      people: {
        edges: [{ node: { id: 'source', github: 'demo' } }],
        pageInfo: { hasNextPage: true, endCursor: 'page-51' },
      },
    });
    const scanned = await scanBackfillPage(current);
    expect(scanned).toMatchObject({
      status: 'SCANNING',
      scanned: 5001,
      cursor: 'page-51',
      truncated: false,
      estimatedRequests: 0,
    });
    expect(mocks.request.mock.calls[0][1]).toEqual({
      after: 'page-50',
      first: 100,
    });
  });
  it('finishes an unlimited preview only at the end of the collection', async () => {
    const current = plan();
    mocks.get.mockResolvedValue(structuredClone(current));
    mocks.request.mockResolvedValue({
      people: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
    });
    expect(await scanBackfillPage(current)).toMatchObject({
      status: 'PLANNED',
      previewComplete: true,
      truncated: false,
    });
  });
  it('honors a custom cap and reports truncation', async () => {
    const current = { ...plan(), scanned: 0, scanLimit: 1, cursor: null };
    mocks.get.mockResolvedValue(structuredClone(current));
    mocks.request.mockResolvedValue({
      people: {
        edges: [{ node: { id: 'source', github: 'demo' } }],
        pageInfo: { hasNextPage: true, endCursor: 'next' },
      },
    });
    expect(await scanBackfillPage(current)).toMatchObject({
      status: 'PLANNED',
      previewComplete: true,
      scanned: 1,
      truncated: true,
    });
    expect(mocks.request.mock.calls[0][1].first).toBe(1);
  });
  it('preserves a cancellation received during a scan request', async () => {
    const current = plan();
    mocks.get.mockResolvedValue({ ...current, status: 'CANCELLED' });
    mocks.request.mockResolvedValue({
      people: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
    });
    expect((await scanBackfillPage(current)).status).toBe('CANCELLED');
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
