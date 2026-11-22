vi.mock('../../utils/can-attach-record-to-inbox', () => ({
  canAttachRecordToInbox: mocks.canAttach,
}));
import { createHmac } from 'node:crypto';

import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  graphql: vi.fn(),
  send: vi.fn(),
  attach: vi.fn(),
  canAttach: vi.fn(),
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (configuration: unknown) => configuration,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set },
  sendInboxMessage: mocks.send,
  attachRecordToInboxThread: mocks.attach,
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    mutation = (input: {
      sendInboxMessage?: { __args: { input: unknown } };
      attachRecordToInboxThread?: unknown;
    }) =>
      input.sendInboxMessage
        ? mocks
            .send(input.sendInboxMessage.__args.input)
            .then((result: { threadId: string }) => ({
              sendInboxMessage: result,
            }))
        : mocks.attach(input);
  },
}));
vi.mock('../../utils/graphql', () => ({ graphql: mocks.graphql }));
import { openBotReplyHandler } from '../../logic-functions/openbot-reply';
import {
  getOpenBotReplyId,
  getOpenBotReplySecret,
  type OpenBotDelivery,
} from '../tasks';

const agent = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  avatarUrl: null,
  webhookUrl: 'https://hooks.example.com/research',
  webhookSecret: 'whsec_abcdefghijklmnopqrstuvwxyz1234567890',
};
const commentId = '22222222-2222-4222-8222-222222222222';
const deliveryId = `${commentId}:${agent.id}`;
const delivery: OpenBotDelivery = {
  id: deliveryId,
  expiresAt: Date.now() + 86400000,
  status: 'accepted',
  task: {
    agentId: agent.id,
    commentId,
    threadId: commentId,
    objectName: 'company',
    recordId: '33333333-3333-4333-8333-333333333333',
    recordLabel: 'Acme',
    requestedBy: 'member',
    text: '@Research Bot research Acme',
    replyUrl: 'https://crm.example.com/reply',
  },
};
const context = {
  workspaceId: 'workspace',
  userWorkspaceId: null,
  workspaceMemberId: null,
  retryCount: 0,
  maxRetries: 3,
};
const parent = {
  id: commentId,
  parentId: null,
  targetObject: 'company',
  targetRecordId: delivery.task.recordId,
  deleted: false,
  resolved: false,
};
const request = (text = 'Research complete') => {
  const rawBody = JSON.stringify({
    deliveryId,
    text,
    authorId: 'spoofed-member',
    parentId: 'other-thread',
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = getOpenBotReplySecret(agent, context.workspaceId, deliveryId);
  return {
    rawBody,
    body: null,
    isBase64Encoded: false,
    headers: {
      'x-openbot-timestamp': timestamp,
      'x-openbot-signature': `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`,
    },
    pathParameters: {},
    queryStringParameters: {},
    requestContext: { http: { method: 'POST', path: '/reply' } },
    userWorkspaceId: null,
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([agent]));
  mocks.get.mockImplementation(async (key) =>
    key.startsWith('openbot:delivery:')
      ? delivery
      : key.startsWith('openbot:source:')
        ? parent
        : null,
  );
  mocks.graphql.mockResolvedValue({
    botRequests: { edges: [] },
  });
  mocks.canAttach.mockResolvedValue(true);
  mocks.send.mockResolvedValue({ threadId: 'inbox-thread' });
});

it('stores a bot-owned reply without any Comments object access', async () => {
  expect((await openBotReplyHandler(request(), context)).status).toBe(200);
  expect(mocks.set).toHaveBeenCalledWith(
    `openbot:reply:${deliveryId}`,
    expect.objectContaining({
      authorId: agent.id,
      authorName: agent.name,
      authorKind: 'BOT',
      parentId: commentId,
    }),
  );
  expect(
    mocks.graphql.mock.calls.every(
      ([query]) => !query.includes('recordComment'),
    ),
  ).toBe(true);
  expect(mocks.send).toHaveBeenCalledWith(
    expect.objectContaining({ idempotencyKey: getOpenBotReplyId(deliveryId) }),
  );
});
it('rejects forged signatures before reading private messages', async () => {
  const input = request();
  input.headers['x-openbot-signature'] = `sha256=${'0'.repeat(64)}`;
  expect((await openBotReplyHandler(input, context)).status).toBe(401);
  expect(mocks.get).toHaveBeenCalledTimes(1);
  expect(mocks.graphql).not.toHaveBeenCalled();
});
it('rejects a conflicting concurrent reply claim', async () => {
  mocks.graphql.mockResolvedValue({
    botRequests: { edges: [{ node: { name: 'different-digest' } }] },
  });
  expect((await openBotReplyHandler(request(), context)).status).toBe(409);
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});
it('rejects a callback after its private source thread was resolved', async () => {
  mocks.get.mockImplementation(async (key) =>
    key.startsWith('openbot:delivery:')
      ? delivery
      : key.startsWith('openbot:source:')
        ? { ...parent, resolved: true }
        : null,
  );
  expect((await openBotReplyHandler(request(), context)).status).toBe(409);
  expect(mocks.set).not.toHaveBeenCalled();
});

it('saves the reply and notification when the target cannot hold an Inbox record chip', async () => {
  mocks.canAttach.mockResolvedValue(false);
  expect((await openBotReplyHandler(request(), context)).status).toBe(200);
  expect(mocks.send).toHaveBeenCalled();
  expect(mocks.attach).not.toHaveBeenCalled();
  expect(mocks.set).toHaveBeenCalledWith(
    `openbot:delivery:${deliveryId}`,
    expect.objectContaining({ status: 'replied' }),
  );
});
