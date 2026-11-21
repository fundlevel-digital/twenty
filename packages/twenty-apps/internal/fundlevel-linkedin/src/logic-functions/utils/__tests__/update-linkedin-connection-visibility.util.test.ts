import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  graphql: vi.fn(),
  findAll: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  ensure: vi.fn().mockResolvedValue({ id: 'my-account' }),
}));
vi.mock('src/lib/twenty', () => ({
  graphql: mocks.graphql,
  findAll: mocks.findAll,
}));
vi.mock('twenty-sdk/logic-function', () => ({ kv: { get: mocks.get } }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = mocks.post;
  },
}));
vi.mock('src/logic-functions/utils/ensure-linkedin-account.util', () => ({
  ensureLinkedinAccount: mocks.ensure,
}));
const { updateLinkedinConnectionVisibility } =
  await import('src/logic-functions/utils/update-linkedin-connection-visibility.util');
const connection = { id: 'connection', workspaceMemberId: 'me' };

beforeEach(() => {
  mocks.get.mockImplementation(async (key) =>
    key === 'linkedin-private-records-ready' ? true : 'connection-object',
  );
  mocks.findAll.mockResolvedValue([{ id: 'owned-record' }]);
  mocks.post.mockResolvedValue({});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('native connection privacy', () => {
  it('ignores the legacy settings toggle until internal privacy readiness is verified', async () => {
    vi.stubEnv('CONNECTION_PRIVACY_READY', 'true');
    mocks.get.mockResolvedValue(false);
    await expect(
      updateLinkedinConnectionVisibility(connection as never, 'OWNER'),
    ).rejects.toThrow('configure LinkedIn record permissions');
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it('restricts only the authenticated account before recording owner-only visibility', async () => {
    await updateLinkedinConnectionVisibility(connection as never, 'OWNER');
    expect(mocks.findAll).toHaveBeenCalledWith(
      'linkedinConnections',
      { accountId: { eq: 'my-account' } },
      'id',
      expect.any(Object),
    );
    expect(mocks.post.mock.calls[0][1].variables).toEqual({
      target: {
        objectMetadataId: 'connection-object',
        recordId: 'owned-record',
      },
      isPrivate: true,
    });
    expect(mocks.post.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.graphql.mock.invocationCallOrder[0],
    );
    expect(mocks.graphql.mock.calls[0][1]).toEqual({
      filter: { accountId: { eq: 'my-account' }, id: { in: ['owned-record'] } },
      data: { visibility: 'OWNER', ownerId: 'me' },
    });
  });
  it('does not report private visibility when the native privacy change fails', async () => {
    mocks.post.mockResolvedValueOnce({
      errors: [{ message: 'not authorized' }],
    });
    await expect(
      updateLinkedinConnectionVisibility(connection as never, 'OWNER'),
    ).rejects.toThrow('not authorized');
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it('records workspace visibility before publishing private records', async () => {
    await updateLinkedinConnectionVisibility(connection as never, 'WORKSPACE');
    expect(mocks.graphql.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.post.mock.invocationCallOrder[0],
    );
    expect(mocks.post.mock.calls[0][1].variables.isPrivate).toBe(false);
  });
});
