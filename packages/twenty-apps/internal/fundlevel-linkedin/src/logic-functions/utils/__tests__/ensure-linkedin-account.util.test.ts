import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  graphql: vi.fn(),
  upsertMany: vi.fn(),
  profile: vi.fn(),
  listConnections: vi.fn(),
}));
vi.mock('src/lib/twenty', () => ({
  findAll: mocks.findAll,
  graphql: mocks.graphql,
  upsertMany: mocks.upsertMany,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  listConnections: mocks.listConnections,
}));
vi.mock('src/unipile/utils/get-unipile-user.util', () => ({
  getUnipileUser: mocks.profile,
}));
vi.mock('src/unipile/utils/with-unipile-account-request.util', () => ({
  withLinkedinLease: (_key: string, operation: () => Promise<unknown>) =>
    operation(),
}));
const { ensureLinkedinAccount } =
  await import('src/logic-functions/utils/ensure-linkedin-account.util');
const connection = {
  id: 'connection',
  externalAccountId: 'new-upstream',
  workspaceMemberId: 'owner',
  userWorkspaceId: 'user-workspace',
  name: 'Me',
  providerName: 'linkedin',
};
describe('account ownership and relinking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile.mockResolvedValue({ id: 'ACoAme' });
    mocks.graphql.mockResolvedValue({
      data: { updateLinkedinAccount: { id: 'legacy' } },
    });
    mocks.upsertMany.mockResolvedValue(['created']);
    mocks.listConnections.mockResolvedValue([]);
  });
  it('refuses to take an account from another workspace member', async () => {
    mocks.findAll.mockResolvedValueOnce([{ id: 'legacy', ownerId: 'other' }]);
    await expect(ensureLinkedinAccount(connection as never)).rejects.toThrow(
      'belongs to another member',
    );
    expect(mocks.upsertMany).not.toHaveBeenCalled();
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it('updates a relinked account by its known record ID and retains the old upstream ID for attachments', async () => {
    mocks.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'legacy',
          linkedinUserId: 'ACoAme',
          unipileAccountId: 'old-upstream',
          ownerId: 'owner',
          connectedAccountId: null,
        },
      ]);
    await expect(
      ensureLinkedinAccount(connection as never),
    ).resolves.toMatchObject({
      id: 'legacy',
      legacyUnipileAccountId: 'old-upstream',
    });
    expect(mocks.upsertMany).not.toHaveBeenCalled();
    expect(mocks.graphql.mock.calls[0][1]).toMatchObject({
      id: 'legacy',
      data: { unipileAccountId: 'new-upstream', ownerId: 'owner' },
    });
  });
  it('refuses a second active connection to the same LinkedIn account', async () => {
    mocks.findAll.mockResolvedValueOnce([
      {
        id: 'legacy',
        ownerId: 'owner',
        connectedAccountId: 'other-connection',
      },
    ]);
    mocks.listConnections.mockResolvedValue([{ id: 'other-connection' }]);
    await expect(ensureLinkedinAccount(connection as never)).rejects.toThrow(
      'already connected',
    );
  });
});
