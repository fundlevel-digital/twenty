import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  comments: vi.fn(),
  connections: vi.fn(),
  get: vi.fn(),
}));
vi.mock('../../logic-functions/comments', () => ({
  commentsHandler: mocks.comments,
}));
vi.mock('../connections', () => ({ getOpenBotConnections: mocks.connections }));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  kv: { get: mocks.get },
}));
import { sendToOpenBot } from '../../logic-functions/openbot-send';
import { getOpenBotRequestStatus } from '../../logic-functions/openbot-status';
import { getOpenBotReplyId } from '../tasks';
const agentId = '11111111-1111-4111-8111-111111111111';
const commentId = '22222222-2222-4222-8222-222222222222';
const requestId = `${commentId}:${agentId}`;
const context = { workspaceMemberId: 'member' } as Parameters<
  typeof sendToOpenBot
>[1];
const input = {
  agentId,
  objectName: 'company',
  recordId: 'record',
  prompt: 'Research this account',
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.connections.mockResolvedValue([{ id: agentId, name: 'Research Bot' }]);
  mocks.comments.mockResolvedValue({
    comments: [{ id: commentId }],
    openBotDeliveryFailed: false,
  });
  mocks.get.mockResolvedValue({
    id: requestId,
    status: 'accepted',
    expiresAt: Date.now() + 60000,
    task: { objectName: 'company', recordId: 'record', commentId },
  });
});
it('sends workflow work through the normal validated record comment handler', async () => {
  expect(await sendToOpenBot(input, context)).toEqual({
    requestId,
    status: 'pending',
    commentId,
  });
  expect(mocks.comments).toHaveBeenCalledWith(
    {
      body: {
        action: 'create',
        objectName: 'company',
        recordId: 'record',
        body: '@Research Bot Research this account',
        mentions: [
          { id: agentId, label: 'Research Bot', objectName: 'openbotAgent' },
        ],
      },
    },
    context,
  );
});
it('rejects workflows without a member identity or enrolled agent', async () => {
  await expect(
    sendToOpenBot(input, { ...context, workspaceMemberId: null }),
  ).rejects.toThrow('workspace member');
  mocks.connections.mockResolvedValue([]);
  await expect(sendToOpenBot(input, context)).rejects.toThrow('enrolled');
  expect(mocks.comments).not.toHaveBeenCalled();
});
it('fails the workflow send action when its saved comment cannot be queued', async () => {
  mocks.comments.mockResolvedValue({
    comments: [{ id: commentId }],
    openBotDeliveryFailed: true,
  });
  await expect(sendToOpenBot(input, context)).rejects.toThrow(requestId);
});
it('checks caller record access before returning request status', async () => {
  mocks.comments.mockRejectedValue(new Error('Forbidden'));
  await expect(getOpenBotRequestStatus({ requestId }, context)).rejects.toThrow(
    'Forbidden',
  );
});
it('returns timeout state for failure branches and only returns a saved reply after access checks', async () => {
  mocks.get.mockResolvedValueOnce({
    status: 'accepted',
    expiresAt: Date.now() - 1,
    task: { objectName: 'company', recordId: 'record', commentId },
  });
  expect(await getOpenBotRequestStatus({ requestId }, context)).toMatchObject({
    status: 'failed',
    answer: null,
  });
  mocks.get.mockResolvedValue({
    status: 'replied',
    expiresAt: Date.now() + 10000,
    task: { objectName: 'company', recordId: 'record', commentId },
  });
  mocks.comments.mockResolvedValue({
    comments: [
      { id: commentId },
      { id: getOpenBotReplyId(requestId), body: 'Saved answer' },
    ],
  });
  expect(await getOpenBotRequestStatus({ requestId }, context)).toMatchObject({
    status: 'replied',
    answer: 'Saved answer',
  });
});
