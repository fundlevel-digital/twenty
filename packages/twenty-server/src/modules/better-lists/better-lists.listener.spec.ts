import { BetterListsListener } from 'src/modules/better-lists/better-lists.listener';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));

describe('Better Lists memberships', () => {
  const listId = '12345678-1234-1234-1234-123456789abc';
  const membershipValue = 'LIST_12345678123412341234123456789ABC';
  const makeHarness = (hasMembership: boolean) => {
    const parents = new Map([
      ['first', { id: 'first', betterListEntries: ['OTHER_LIST'] }],
      ['second', { id: 'second', betterListEntries: [membershipValue] }],
    ]);
    const parentRepository = {
      findOne: jest.fn(async ({ where: { id } }: { where: { id: string } }) =>
        parents.get(id),
      ),
      update: jest.fn(
        async (id: string, update: { betterListEntries: string[] }) => {
          const parent = parents.get(id);
          if (parent) {
            Object.assign(parent, update);
          }
        },
      ),
    };
    const entryRepository = { exists: jest.fn(async () => hasMembership) };
    const transaction = {
      executeRawQuery: jest.fn(async () => []),
      getRepositoryWithoutPermissionChecks: (name: string) =>
        name === 'person' ? parentRepository : entryRepository,
    };
    const manager = {
      executeInWorkspaceContext: jest.fn(
        async (callback: () => Promise<void>) => callback(),
      ),
      runInWorkspaceTransaction: jest.fn(
        async (callback: (scope: typeof transaction) => Promise<void>) =>
          callback(transaction),
      ),
    };
    const listener = new BetterListsListener(
      manager as unknown as WorkspaceOrmManager,
    );
    const payload = {
      name: 'list.created',
      workspaceId: 'workspace',
      objectMetadata: {
        id: listId,
        nameSingular: 'list',
        description: 'better-lists:v1:person|📋|targets',
      },
      events: [
        {
          properties: {
            before: { parentRecordId: 'second' },
            after: { parentRecordId: 'first' },
          },
        },
      ],
    } as unknown as Parameters<typeof listener.synchronizeMembership>[0];
    return { listener, payload, parents, entryRepository, manager };
  };

  it('adds membership without replacing membership in other lists', async () => {
    const { listener, payload, parents } = makeHarness(true);
    await listener.synchronizeMembership(payload);
    expect(parents.get('first')?.betterListEntries).toEqual([
      'OTHER_LIST',
      membershipValue,
    ]);
    expect(parents.get('second')?.betterListEntries).toEqual([membershipValue]);
  });

  it('rechecks both parents on a move and removes membership only after the last entry is gone', async () => {
    const { listener, payload, parents, entryRepository } = makeHarness(false);
    await listener.synchronizeMembership(payload);
    expect(entryRepository.exists).toHaveBeenCalledWith({
      where: { parentRecordId: 'first' },
    });
    expect(entryRepository.exists).toHaveBeenCalledWith({
      where: { parentRecordId: 'second' },
    });
    expect(parents.get('first')?.betterListEntries).toEqual(['OTHER_LIST']);
    expect(parents.get('second')?.betterListEntries).toEqual([]);
  });

  it('ignores events from ordinary objects', async () => {
    const { listener, payload, manager } = makeHarness(true);
    payload.objectMetadata.description = 'Ordinary CRM object';
    await listener.synchronizeMembership(payload);
    expect(manager.executeInWorkspaceContext).not.toHaveBeenCalled();
  });
});
