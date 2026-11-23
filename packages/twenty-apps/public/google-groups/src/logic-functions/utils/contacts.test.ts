import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn() }));
vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient: class {
    query = mocks.query;
    mutation = mocks.mutation;
  },
}));
import { resolvePerson } from 'src/logic-functions/utils/contacts';

const personId = '63c97953-2d14-4f83-907e-2083d2150714';
const found = (ids: string[]) => ({
  people: { edges: ids.map((id) => ({ node: { id } })) },
});
describe('contact creation policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue(found([]));
    mocks.mutation.mockResolvedValue({});
  });
  it.each([
    ['NONE', 'FROM', false],
    ['NONE', 'TO', false],
    ['SENDERS', 'FROM', true],
    ['SENDERS', 'TO', false],
    ['SENDERS', 'CC', false],
    ['RECIPIENTS', 'FROM', false],
    ['RECIPIENTS', 'TO', true],
    ['RECIPIENTS', 'CC', true],
    ['RECIPIENTS', 'BCC', true],
    ['EVERYONE', 'FROM', true],
    ['EVERYONE', 'TO', true],
  ] as const)('%s for %s creates=%s', async (policy, role, create) => {
    const result = await resolvePerson(
      'person@example.com',
      'Original Name',
      role,
      policy,
      [],
    );
    expect(mocks.mutation).toHaveBeenCalledTimes(create ? 1 : 0);
    expect(Boolean(result)).toBe(create);
  });
  it('matches an existing Person under Never without modifying them', async () => {
    mocks.query.mockResolvedValue(found([personId]));
    expect(
      await resolvePerson('person@example.com', 'New Name', 'FROM', 'NONE', []),
    ).toBe(personId);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it('leaves ambiguous matches unlinked and creates nothing', async () => {
    mocks.query.mockResolvedValue(
      found([personId, 'd044bb24-a196-49a1-a478-011daed72763']),
    );
    expect(
      await resolvePerson('person@example.com', 'Name', 'FROM', 'EVERYONE', []),
    ).toBeUndefined();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it('excludes the mailbox, aliases and Groups case-insensitively', async () => {
    expect(
      await resolvePerson('OWNER@example.com', 'Owner', 'FROM', 'EVERYONE', [
        'owner@example.com',
      ]),
    ).toBeUndefined();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it('reuses deterministic IDs and accepts a concurrently created match', async () => {
    mocks.query
      .mockResolvedValueOnce(found([]))
      .mockResolvedValueOnce(found([personId]));
    mocks.mutation.mockRejectedValueOnce(new Error('Duplicate ID'));
    expect(
      await resolvePerson(
        'person@example.com',
        'Full Name',
        'FROM',
        'EVERYONE',
        [],
      ),
    ).toBe(personId);
  });
  it('propagates a creation failure instead of attaching an unrelated Person', async () => {
    mocks.mutation.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(
      resolvePerson('person@example.com', '', 'FROM', 'EVERYONE', []),
    ).rejects.toThrow('Permission denied');
  });
});
