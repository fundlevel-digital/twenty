import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getConnection: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({
  getConnection: mocks.getConnection,
}));
const { getOwnedLinkedinConnection } = await import(
  'src/logic-functions/utils/get-owned-linkedin-connection.util'
);
beforeEach(() => {
  mocks.getConnection.mockResolvedValue({
    id: 'connection',
    userWorkspaceId: 'owner',
  });
});
describe('connection ownership', () => {
  it('accepts the owner and provider jobs without a user context', async () => {
    await expect(
      getOwnedLinkedinConnection('connection', { userWorkspaceId: 'owner' }),
    ).resolves.toMatchObject({ id: 'connection' });
    await expect(
      getOwnedLinkedinConnection('connection'),
    ).resolves.toMatchObject({ id: 'connection' });
  });
  it('rejects access from another member', async () => {
    await expect(
      getOwnedLinkedinConnection('connection', { userWorkspaceId: 'other' }),
    ).rejects.toThrow('another member');
  });
});
