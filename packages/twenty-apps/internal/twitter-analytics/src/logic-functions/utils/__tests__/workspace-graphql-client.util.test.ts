import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-graphql-client.util';

const { post, constructorOptions } = vi.hoisted(() => ({
  post: vi.fn(),
  constructorOptions: [] as unknown[],
}));

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    constructor(options: unknown) {
      constructorOptions.push(options);
    }

    post = post;
  },
}));

beforeEach(() => {
  post.mockReset();
  constructorOptions.length = 0;
});

describe('createWorkspaceGraphqlClient', () => {
  it('posts the query and variables to /graphql as the application', async () => {
    post.mockResolvedValue({ data: { twitterProfiles: null } });

    const data = await createWorkspaceGraphqlClient().request('query { a }', {
      first: 1,
    });

    expect(constructorOptions).toEqual([{ runAs: 'application' }]);
    expect(post).toHaveBeenCalledWith('/graphql', {
      query: 'query { a }',
      variables: { first: 1 },
    });
    expect(data).toEqual({ twitterProfiles: null });
  });

  it('throws the joined GraphQL error messages', async () => {
    post.mockResolvedValue({
      data: null,
      errors: [{ message: 'first problem' }, { message: 'second problem' }],
    });

    await expect(
      createWorkspaceGraphqlClient().request('query { a }', {}),
    ).rejects.toThrow('first problem; second problem');
  });
});
