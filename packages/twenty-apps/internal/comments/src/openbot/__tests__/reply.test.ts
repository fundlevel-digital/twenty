import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  graphql: vi.fn(),
  send: vi.fn(),
  attach: vi.fn(),
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
  mocks.get.mockResolvedValue(delivery);
  mocks.graphql.mockResolvedValue({
    recordComments: { edges: [{ node: parent }] },
  });
  mocks.send.mockResolvedValue({ threadId: 'inbox-thread' });
});

describe('authenticated OpenBot callback', () => {
  it('sets the bot author and original thread on the server, ignoring caller-supplied identity', async () => {
    const result = await openBotReplyHandler(request(), context);
    expect(result.status).toBe(200);
    const create = mocks.graphql.mock.calls.find(([query]) =>
      query.startsWith('mutation'),
    );
    expect(create?.[1].data).toMatchObject({
      id: getOpenBotReplyId(deliveryId),
      authorId: agent.id,
      authorName: agent.name,
      authorKind: 'BOT',
      parentId: commentId,
      targetRecordId: delivery.task.recordId,
      mentions: '[]',
    });
    expect(mocks.send.mock.calls[0][0]).toMatchObject({
      workspaceMemberIds: ['member'],
      idempotencyKey: getOpenBotReplyId(deliveryId),
    });
    expect(mocks.set.mock.calls[0][1].status).toBe('replied');
  });
  it('rejects forged signatures before reading or writing comments', async () => {
    const input = request();
    input.headers['x-openbot-signature'] = `sha256=${'0'.repeat(64)}`;
    expect((await openBotReplyHandler(input, context)).status).toBe(401);
    expect(mocks.graphql).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects tampered data, expired tasks and missing raw bytes', async () => {
    const input = request();
    input.rawBody += ' ';
    expect((await openBotReplyHandler(input, context)).status).toBe(401);
    mocks.get.mockResolvedValue({ ...delivery, expiresAt: Date.now() - 1 });
    expect((await openBotReplyHandler(request(), context)).status).toBe(404);
    expect(
      (await openBotReplyHandler({ ...request(), rawBody: undefined }, context))
        .status,
    ).toBe(400);
    expect(mocks.graphql).not.toHaveBeenCalled();
  });
  it.each([
    { resolved: true },
    { deleted: true },
    { targetRecordId: 'other-record' },
  ])(
    'cannot reply into a closed or different record thread %j',
    async (override) => {
      mocks.graphql.mockResolvedValue({
        recordComments: { edges: [{ node: { ...parent, ...override } }] },
      });
      expect((await openBotReplyHandler(request(), context)).status).toBe(409);
      expect(mocks.send).not.toHaveBeenCalled();
      expect(mocks.graphql).toHaveBeenCalledTimes(1);
    },
  );
  it('accepts duplicate callbacks without adding another comment', async () => {
    const reply = {
      ...parent,
      id: getOpenBotReplyId(deliveryId),
      parentId: commentId,
      authorId: agent.id,
      body: 'Research complete',
    };
    mocks.graphql.mockResolvedValue({
      recordComments: { edges: [{ node: parent }, { node: reply }] },
    });
    expect((await openBotReplyHandler(request(), context)).status).toBe(200);
    expect(mocks.graphql).toHaveBeenCalledTimes(1);
  });
  it('rejects replacing a completed task with a different answer', async () => {
    const reply = {
      ...parent,
      id: getOpenBotReplyId(deliveryId),
      parentId: commentId,
      authorId: agent.id,
      body: 'Original answer',
    };
    mocks.graphql.mockResolvedValue({
      recordComments: { edges: [{ node: parent }, { node: reply }] },
    });
    expect((await openBotReplyHandler(request(), context)).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
