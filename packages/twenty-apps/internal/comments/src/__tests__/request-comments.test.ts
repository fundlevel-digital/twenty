import { beforeEach, expect, it, vi } from 'vitest';
import { IDENTIFIERS } from '../constants/identifiers';
const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn() }));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = mocks.query;
    mutation = mocks.mutation;
  },
}));
const input = {
  objectName: 'company',
  recordId: 'record',
  action: 'list' as const,
};
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.query.mockResolvedValue({
    findManyLogicFunctions: [
      { id: 'function', universalIdentifier: IDENTIFIERS.function },
    ],
  });
  mocks.mutation.mockResolvedValue({
    executeOneLogicFunction: {
      status: 'SUCCESS',
      data: { comments: [], memberId: 'member', recordLabel: 'Acme' },
    },
  });
});
it('uses metadata execution with the authenticated handler payload', async () => {
  const { requestComments } = await import('../utils/request-comments');
  expect(await requestComments(input)).toMatchObject({ recordLabel: 'Acme' });
  expect(mocks.mutation).toHaveBeenCalledWith({
    executeOneLogicFunction: {
      __args: { input: { id: 'function', payload: { body: input } } },
      data: true,
      status: true,
      error: true,
    },
  });
});
it('allows retry after function discovery fails', async () => {
  const { requestComments } = await import('../utils/request-comments');
  mocks.query.mockRejectedValueOnce(new Error('Offline'));
  await expect(requestComments(input)).rejects.toThrow('Offline');
  expect(await requestComments(input)).toMatchObject({ comments: [] });
});
it('surfaces handler failures instead of displaying a successful empty list', async () => {
  const { requestComments } = await import('../utils/request-comments');
  mocks.mutation.mockResolvedValueOnce({
    executeOneLogicFunction: { status: 'ERROR', data: null },
  });
  await expect(requestComments(input)).rejects.toThrow(
    'Comments request failed',
  );
});
