import { beforeEach, expect, it, vi } from 'vitest';
import { accessibleConnections } from 'src/logic-functions/utils/accessible-connections';
import { type LogicFunctionExecutionContext } from 'twenty-sdk/logic-function';
const { post, listCalComConnections } = vi.hoisted(() => ({
  post: vi.fn(),
  listCalComConnections: vi.fn(),
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = post;
  },
}));
vi.mock('src/logic-functions/utils/list-cal-com-connections', () => ({
  listCalComConnections,
}));
const context = {
  userWorkspaceId: 'requester',
} as LogicFunctionExecutionContext;
beforeEach(() => {
  post.mockReset();
  listCalComConnections.mockReset();
  listCalComConnections.mockResolvedValue([
    { id: 'own', scope: 'USER', userWorkspaceId: 'requester' },
    { id: 'other', scope: 'USER', userWorkspaceId: 'someone-else' },
    { id: 'shared', scope: 'WORKSPACE' },
  ]);
});
it('never exposes another user’s personal connection', async () => {
  post.mockResolvedValue({
    data: {
      currentUser: {
        currentUserWorkspace: { permissionFlags: ['CONNECTED_ACCOUNTS'] },
      },
    },
  });
  const result = await accessibleConnections(context);
  expect(result.connections.map((connection) => connection.id)).toEqual([
    'own',
    'shared',
  ]);
  expect(result.canManage(result.connections[0])).toBe(true);
  expect(result.canManage(result.connections[1])).toBe(false);
});
it('requires app-management permission for shared account changes', async () => {
  post.mockResolvedValue({
    data: {
      currentUser: {
        currentUserWorkspace: { permissionFlags: ['APPLICATIONS'] },
      },
    },
  });
  const result = await accessibleConnections(context);
  expect(result.canManage(result.connections[1])).toBe(true);
  expect(result.canManage(result.connections[0])).toBe(false);
});
it('rejects requests without a user identity', async () => {
  await expect(
    accessibleConnections({ ...context, userWorkspaceId: null }),
  ).rejects.toThrow('Sign in');
  expect(post).not.toHaveBeenCalled();
});
it('fails closed when caller permissions cannot be verified', async () => {
  post.mockResolvedValue({ errors: [{ message: 'denied' }] });
  await expect(accessibleConnections(context)).rejects.toThrow(
    'verify account permissions',
  );
});
