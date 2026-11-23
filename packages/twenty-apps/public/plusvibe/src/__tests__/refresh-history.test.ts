import { describe, expect, it, vi } from 'vitest';

const { request, ingest } = vi.hoisted(() => ({
  request: vi.fn(),
  ingest: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: async () => ['workspace'] },
}));
vi.mock('src/logic-functions/utils/require-application-manager', () => ({
  canManageApplication: async () => true,
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  plusvibeRequest: request,
}));
vi.mock('src/logic-functions/utils/map-email', () => ({
  mapEmail: (value: unknown) => value,
}));
vi.mock('src/logic-functions/utils/native-email', () => ({
  syncNativeEmail: ingest,
}));
import { refreshHistoryHandler } from 'src/logic-functions/refresh-history';

describe('history repair pages', () => {
  it('reports individual failures while importing the remaining emails', async () => {
    request.mockResolvedValue({
      data: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
      has_more: true,
      next_starting_after: 'next',
    });
    ingest
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Missing sender'))
      .mockResolvedValueOnce(undefined);
    expect(await refreshHistoryHandler({ workspaceId: 'workspace' })).toEqual({
      imported: 2,
      failures: [{ index: 1, error: 'Missing sender' }],
      nextCursor: 'next',
    });
    expect(ingest).toHaveBeenCalledTimes(3);
  });
});
