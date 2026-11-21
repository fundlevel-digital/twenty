import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  graphql: vi.fn(),
  wait: vi.fn(),
}));
vi.mock('src/lib/twenty', () => ({
  findAll: mocks.findAll,
  graphql: mocks.graphql,
  TwentyError: class extends Error {},
}));
vi.mock('src/utils/wait.util', () => ({ wait: mocks.wait }));
const { TwentyError } = await import('src/lib/twenty');
const { withUnipileAccountRequest } =
  await import('src/unipile/utils/with-unipile-account-request.util');
describe('shared account request lease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAll.mockResolvedValue([]);
    mocks.graphql.mockResolvedValue({
      data: { createLinkedinSyncLease: { id: 'lease' } },
    });
    mocks.wait.mockResolvedValue(undefined);
  });
  it('retries a competing unique-key claim before issuing the request', async () => {
    mocks.graphql.mockRejectedValueOnce(
      new TwentyError('duplicate unique account key'),
    );
    const request = vi.fn().mockResolvedValue('result');
    await expect(withUnipileAccountRequest('account', request)).resolves.toBe(
      'result',
    );
    expect(request).toHaveBeenCalledOnce();
    expect(mocks.wait).toHaveBeenCalledWith(250);
    expect(mocks.wait).toHaveBeenCalledWith(2100);
    expect(
      mocks.graphql.mock.calls[mocks.graphql.mock.calls.length - 1]?.[1],
    ).toEqual({ id: 'lease' });
  });
  it('releases an acquired lease when the provider request fails', async () => {
    await expect(
      withUnipileAccountRequest('account', async () => {
        throw new Error('provider failed');
      }),
    ).rejects.toThrow('provider failed');
    expect(
      mocks.graphql.mock.calls[mocks.graphql.mock.calls.length - 1]?.[1],
    ).toEqual({ id: 'lease' });
  });
  it('does not turn a successful send into a failure if cleanup is unavailable', async () => {
    mocks.graphql
      .mockResolvedValueOnce({
        data: { createLinkedinSyncLease: { id: 'lease' } },
      })
      .mockRejectedValueOnce(new Error('cleanup offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      withUnipileAccountRequest('account', async () => 'sent'),
    ).resolves.toBe('sent');
    log.mockRestore();
  });
  it('does not proceed on a schema or authorization error', async () => {
    mocks.graphql.mockRejectedValueOnce(new TwentyError('not authorized'));
    const request = vi.fn();
    await expect(withUnipileAccountRequest('account', request)).rejects.toThrow(
      'not authorized',
    );
    expect(request).not.toHaveBeenCalled();
  });
});
