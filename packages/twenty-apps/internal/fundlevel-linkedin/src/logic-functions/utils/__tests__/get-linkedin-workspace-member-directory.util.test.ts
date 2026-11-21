import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findAll: vi.fn(),
  listMessageChannels: vi.fn(),
}));
vi.mock('src/lib/twenty', () => ({ findAll: mocks.findAll }));
vi.mock('twenty-sdk/logic-function', () => ({
  listMessageChannels: mocks.listMessageChannels,
}));
const { getLinkedinWorkspaceMemberDirectory, findLinkedinWorkspaceMember } =
  await import(
    'src/logic-functions/utils/get-linkedin-workspace-member-directory.util'
  );

beforeEach(() => {
  mocks.findAll.mockResolvedValue([
    {
      ownerId: 'member',
      linkedinUserId: 'ACoMEMBER',
      connectedAccountId: 'connection',
      profileLink: { primaryLinkUrl: 'https://www.linkedin.com/in/Member' },
    },
  ]);
  mocks.listMessageChannels.mockResolvedValue([
    {
      connectedAccountId: 'connection',
      handle: 'https://www.linkedin.com/in/member-alias',
    },
    {
      connectedAccountId: 'unrelated',
      handle: 'https://www.linkedin.com/in/external',
    },
  ]);
});

describe('workspace member LinkedIn identities', () => {
  it('matches stable IDs, owned profile URLs and connected channel handles', async () => {
    const directory = await getLinkedinWorkspaceMemberDirectory();
    for (const user of [
      { id: 'ACoMEMBER' },
      { id: 'other-id', public_identifier: 'MEMBER' },
      {
        id: 'other-id',
        profile_url: 'https://www.linkedin.com/in/member-alias?tracking=1',
      },
    ]) {
      expect(findLinkedinWorkspaceMember(user, directory)).toEqual({
        isInternal: true,
        workspaceMemberId: 'member',
      });
    }
    expect(mocks.findAll.mock.calls[0][1]).toEqual({
      ownerId: { is: 'NOT_NULL' },
    });
    expect(
      findLinkedinWorkspaceMember(
        { id: 'external', public_identifier: 'external' },
        directory,
      ),
    ).toEqual({ isInternal: false });
  });

  it('does not attribute conflicting identities to either workspace member', async () => {
    mocks.findAll.mockResolvedValue([
      { ownerId: 'first', linkedinUserId: 'shared-id', profileLink: null },
      { ownerId: 'second', linkedinUserId: 'shared-id', profileLink: null },
    ]);
    const directory = await getLinkedinWorkspaceMemberDirectory();
    expect(findLinkedinWorkspaceMember({ id: 'shared-id' }, directory)).toEqual(
      { isInternal: true },
    );
    expect(
      findLinkedinWorkspaceMember(
        { id: 'first-id', public_identifier: 'second' },
        new Map([
          ['id:first-id', 'first'],
          ['profile:second', 'second'],
        ]),
      ),
    ).toEqual({ isInternal: true });
  });
});
