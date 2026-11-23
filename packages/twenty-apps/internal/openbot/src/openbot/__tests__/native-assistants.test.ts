import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  queue: vi.fn(),
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = mocks.post;
  },
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set },
}));
vi.mock('../queue-comment', () => ({ queueOpenBotMentions: mocks.queue }));
import { openBotInboxRequest } from '../../logic-functions/openbot-inbox-request';
const bot = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  webhookUrl: 'https://hooks.example.test/routine',
  webhookSecret: 's'.repeat(40),
};
const request = {
  id: 'grant',
  assistantId: bot.id,
  threadId: 'native-thread',
  messageId: 'native-message',
  workspaceMemberId: 'member',
  text: 'Canonical native message',
};
const context = { workspaceMemberId: 'member' } as Parameters<
  typeof openBotInboxRequest
>[1];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([bot]));
  mocks.post.mockResolvedValue({ data: { externalAssistantRequest: request } });
  mocks.queue.mockResolvedValue(true);
});
it('fetches the canonical grant before queuing, ignoring spoofed payload content', async () => {
  expect(
    await openBotInboxRequest(
      { requestId: 'grant', text: 'Spoofed' } as { requestId: string },
      context,
    ),
  ).toEqual({ queued: true });
  expect(mocks.queue).toHaveBeenCalledWith(
    expect.objectContaining({
      body: request.text,
      inboxRequestId: 'grant',
      targetObject: 'agentChatThread',
      targetRecordId: 'native-thread',
    }),
    [{ id: bot.id, objectName: 'externalAssistant' }],
    'Inbox Conversation',
  );
});
it('rejects invoking another member’s native request', async () => {
  await expect(
    openBotInboxRequest(
      { requestId: 'grant' },
      { ...context, workspaceMemberId: 'other' },
    ),
  ).rejects.toThrow('another member');
  expect(mocks.queue).not.toHaveBeenCalled();
});
it('stops native delivery when the OpenBot connection is disabled', async () => {
  vi.stubEnv(
    'OPENBOT_CONNECTIONS',
    JSON.stringify([{ ...bot, enabled: false }]),
  );
  await expect(
    openBotInboxRequest({ requestId: 'grant' }, context),
  ).rejects.toThrow('unavailable');
  expect(mocks.queue).not.toHaveBeenCalled();
});
