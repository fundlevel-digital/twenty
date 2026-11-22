import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  graphql: vi.fn(),
  target: vi.fn(),
  queue: vi.fn(),
  records: vi.fn(),
  requests: vi.fn(),
}));
vi.mock('../../utils/graphql', () => ({ graphql: mocks.graphql }));
vi.mock('../../utils/read-record-target', () => ({
  getRecordObjects: vi.fn(async () => []),
  readRecordTarget: mocks.target,
}));
vi.mock('../queue-comment', () => ({ queueOpenBotMentions: mocks.queue }));
vi.mock('../messages', () => ({
  readRecordMessages: mocks.records,
  readRecordRequests: mocks.requests,
  sourceKey: (id: string) => `source:${id}`,
}));
import { openBotBridge } from '../../logic-functions/openbot-bridge';
const context = {
  workspaceId: 'workspace',
  workspaceMemberId: 'member',
} as Parameters<typeof openBotBridge>[1];
const request = (
  body: unknown,
  headers = { authorization: 'Bearer caller-token' },
) =>
  ({
    body,
    headers,
    queryStringParameters: {},
    pathParameters: {},
    isBase64Encoded: false,
    requestContext: { http: { method: 'POST', path: '/openbot/bridge' } },
    userWorkspaceId: null,
  }) as Parameters<typeof openBotBridge>[0];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv(
    'OPENBOT_CONNECTIONS',
    JSON.stringify([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Research Bot',
        webhookUrl: 'https://hooks.example.test/routine',
        webhookSecret: 's'.repeat(40),
      },
    ]),
  );
  mocks.target.mockResolvedValue({ recordLabel: 'Company' });
  mocks.records.mockResolvedValue([]);
  mocks.requests.mockResolvedValue([]);
});
it('rejects missing authentication before reading bot configuration', async () => {
  await expect(
    openBotBridge(request({ action: 'directory' }), {
      ...context,
      workspaceMemberId: null,
    }),
  ).rejects.toThrow('Sign in');
  expect(mocks.graphql).not.toHaveBeenCalled();
});
it('returns a credential-free directory without requiring Comments', async () => {
  const result = await openBotBridge(request({ action: 'directory' }), context);
  expect(result).toEqual([
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Research Bot',
      avatarUrl: null,
    },
  ]);
  expect(JSON.stringify(result)).not.toContain('webhook');
  expect(mocks.graphql).not.toHaveBeenCalled();
});
it('checks target access with delegated member permissions before returning private messages', async () => {
  mocks.target.mockRejectedValue(new Error('Forbidden'));
  await expect(
    openBotBridge(
      request({ action: 'record', objectName: 'company', recordId: 'record' }),
      context,
    ),
  ).rejects.toThrow('Forbidden');
  expect(mocks.target).toHaveBeenCalledWith(
    { objectName: 'company', recordId: 'record' },
    [],
  );
  expect(mocks.records).not.toHaveBeenCalled();
});
it('rejects another member’s comment even if its ID is known', async () => {
  mocks.graphql.mockResolvedValueOnce({
    recordComments: {
      edges: [{ node: { id: 'comment', authorId: 'other', deleted: false } }],
    },
  });
  await expect(
    openBotBridge(request({ action: 'queue', commentId: 'comment' }), context),
  ).rejects.toThrow('Comment unavailable');
  expect(mocks.queue).not.toHaveBeenCalled();
});
it('queues the stored comment and recipients rather than caller supplied text', async () => {
  const comment = {
    id: 'comment',
    authorId: 'member',
    body: '@Research Bot stored',
    mentions: JSON.stringify([{ id: 'bot', objectName: 'bot' }]),
    targetObject: 'company',
    targetRecordId: 'record',
    deleted: false,
  };
  mocks.graphql.mockResolvedValueOnce({
    recordComments: { edges: [{ node: comment }] },
  });
  mocks.queue.mockResolvedValue(true);
  expect(
    await openBotBridge(
      request({ action: 'queue', commentId: 'comment', body: 'spoofed' }),
      context,
    ),
  ).toEqual({ queued: true });
  expect(mocks.queue).toHaveBeenCalledWith(
    comment,
    [{ id: 'bot', objectName: 'bot' }],
    'Company',
  );
});
