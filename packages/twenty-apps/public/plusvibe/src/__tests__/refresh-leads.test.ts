import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request, syncPerson } = vi.hoisted(() => ({
  request: vi.fn(),
  syncPerson: vi.fn(),
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
vi.mock('src/logic-functions/utils/sync-records', () => ({ syncPerson }));
import { refreshLeadsHandler } from 'src/logic-functions/refresh-leads';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('targeted source Lead refresh', () => {
  it('refreshes exact addresses only without fabricating source identities', async () => {
    request.mockResolvedValueOnce({
      data: [
        { _id: 'source-id', email: 'poc@example.com', sent_step: 4 },
        { _id: 'another-id', email: 'other@example.com' },
      ],
      has_more: false,
    });
    expect(
      await refreshLeadsHandler({
        workspaceId: 'workspace',
        emails: ['poc@example.com'],
      }),
    ).toEqual({ imported: 1 });
    expect(syncPerson).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ _id: 'source-id', sent_step: 4 }),
      'workspace',
      { isFullLeadRecord: true },
    );
  });

  it('rejects a matching lead returned from another workspace', async () => {
    request.mockResolvedValueOnce({
      data: [{ email: 'poc@example.com', workspace_id: 'foreign' }],
      has_more: false,
    });
    await expect(
      refreshLeadsHandler({
        workspaceId: 'workspace',
        emails: ['poc@example.com'],
      }),
    ).rejects.toThrow('foreign workspace');
    expect(syncPerson).not.toHaveBeenCalled();
  });
});
