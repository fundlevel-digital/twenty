import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ListObject } from '../../types/list-metadata';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    get = get;
    post = post;
  },
}));

import { addRecordsToList, createList } from '../lists';

const parent: ListObject = {
  id: 'parent',
  nameSingular: 'person',
  namePlural: 'people',
  labelPlural: 'People',
  description: null,
  icon: null,
  isActive: true,
  isSystem: false,
  fieldsList: [
    {
      id: 'membership',
      name: 'betterListEntries',
      type: 'MULTI_SELECT',
      options: [],
    },
  ],
};
const list: ListObject = {
  ...parent,
  id: 'list',
  nameSingular: 'listEntry',
  namePlural: 'listEntries',
  labelPlural: 'Candidates',
  description: 'better-lists:v1:person|📋|candidates',
  fieldsList: [],
};

describe('list commands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a list with a different parent before reading or writing records', async () => {
    await expect(
      addRecordsToList({
        list: { ...list, description: 'better-lists:v1:company|📋|companies' },
        parent,
        recordIds: ['person-1'],
      }),
    ).rejects.toThrow('different parent');
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('reports partial success and retries only failed records', async () => {
    get.mockResolvedValue({
      data: { person: { name: { firstName: 'Test', lastName: 'Person' } } },
    });
    post
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Cannot create this entry'));
    const result = await addRecordsToList({
      list,
      parent,
      recordIds: ['person-1', 'person-2', 'person-1'],
    });
    expect(result).toEqual({ addedIds: ['person-1'], failedIds: ['person-2'] });
    expect(post).toHaveBeenCalledTimes(2);
    post.mockResolvedValueOnce({});
    await addRecordsToList({ list, parent, recordIds: result.failedIds });
    expect(post).toHaveBeenLastCalledWith('/rest/listEntries', {
      parentRecordId: 'person-2',
      name: 'Test Person',
    });
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('can roll back a list whose membership setup fails before the managed marker is published', async () => {
    post.mockResolvedValueOnce({
      data: {
        createOneObject: {
          ...list,
          id: 'incomplete',
          description: 'List setup in progress.',
        },
      },
    });
    post.mockResolvedValueOnce({
      errors: [{ message: 'Membership option rejected' }],
    });
    post.mockResolvedValueOnce({
      data: { deleteOneObject: { id: 'incomplete' } },
    });
    await expect(
      createList({
        name: 'New Candidates',
        emoji: '📋',
        parent,
        objects: [parent, list],
      }),
    ).rejects.toThrow('Membership option rejected');
    const createInput = post.mock.calls[0][1].variables.input.object;
    expect(createInput.description).not.toContain('better-lists:v1:');
    expect(post).toHaveBeenLastCalledWith('/metadata', {
      query: expect.stringContaining('deleteOneObject'),
      variables: { id: 'incomplete' },
    });
  });
});
