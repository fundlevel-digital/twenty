import { beforeEach, expect, it, vi } from 'vitest';
import {
  type AppConnection,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { requestConnection } from 'src/logic-functions/utils/request-connection';

const { listCalComConnections } = vi.hoisted(() => ({
  listCalComConnections: vi.fn(),
}));
vi.mock('src/logic-functions/utils/list-cal-com-connections', () => ({
  listCalComConnections,
}));
const context = {
  userWorkspaceId: 'requester',
} as LogicFunctionExecutionContext;
const personal = {
  id: 'personal',
  scope: 'USER',
  userWorkspaceId: 'requester',
} as AppConnection;
const anotherUser = {
  id: 'another-user',
  scope: 'USER',
  userWorkspaceId: 'someone-else',
} as AppConnection;
const shared = { id: 'shared', scope: 'WORKSPACE' } as AppConnection;
beforeEach(() => listCalComConnections.mockReset());

it('prefers the requesting user’s personal connection over a shared account', async () => {
  listCalComConnections.mockResolvedValue([shared, anotherUser, personal]);
  expect((await requestConnection(context)).id).toBe('personal');
});
it('uses a shared connection when the user has no personal connection', async () => {
  listCalComConnections.mockResolvedValue([anotherUser, shared]);
  expect((await requestConnection(context)).id).toBe('shared');
});
it('does not use another user’s private connection', async () => {
  listCalComConnections.mockResolvedValue([anotherUser]);
  await expect(requestConnection(context)).rejects.toThrow(
    'Connect your Cal.com account',
  );
});

it('gives an actionable result when sync is requested without a connection', async () => {
  listCalComConnections.mockResolvedValue([]);
  const { sync } = await import('src/logic-functions/sync');
  expect(await sync({}, context)).toEqual({
    queued: false,
    error:
      'Connect your Cal.com account in the Cal.com app’s connection settings before continuing.',
  });
});
