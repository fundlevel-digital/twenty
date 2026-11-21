import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({ kv: { get: mocks.get } }));
const { getLinkedinRecordSharing } =
  await import('src/logic-functions/utils/get-linkedin-record-sharing.util');
afterEach(() => vi.clearAllMocks());
describe('record privacy on creation', () => {
  it('grants the owner and application access while excluding other members', async () => {
    mocks.get.mockResolvedValue('application-role');
    await expect(
      getLinkedinRecordSharing({ ownerId: 'owner' }, true),
    ).resolves.toEqual([
      { roleId: 'application-role', accessLevel: 'FULL' },
      { workspaceMemberId: 'owner', accessLevel: 'FULL' },
      { everyone: true, accessLevel: 'NONE' },
    ]);
  });
  it('keeps a workspace connection public while preserving grants needed for a later private switch', async () => {
    mocks.get.mockResolvedValue('application-role');
    const shares = await getLinkedinRecordSharing({ ownerId: 'owner' }, false);
    expect(shares).toEqual([
      { roleId: 'application-role', accessLevel: 'FULL' },
      { workspaceMemberId: 'owner', accessLevel: 'FULL' },
    ]);
  });
  it('keeps an unassigned account accessible only to the application', async () => {
    mocks.get.mockResolvedValue('application-role');
    await expect(
      getLinkedinRecordSharing({ ownerId: null }, true),
    ).resolves.toEqual([
      { roleId: 'application-role', accessLevel: 'FULL' },
      { everyone: true, accessLevel: 'NONE' },
    ]);
  });
  it('fails before creating records when native sharing has not been configured', async () => {
    mocks.get.mockResolvedValue(null);
    await expect(getLinkedinRecordSharing({}, true)).rejects.toThrow(
      'Configure native LinkedIn privacy',
    );
  });
});
