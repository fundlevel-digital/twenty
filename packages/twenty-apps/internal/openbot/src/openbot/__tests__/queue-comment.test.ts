import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  mutation: vi.fn(),
  remember: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: { get: mocks.get, set: mocks.set },
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    mutation = mocks.mutation;
  },
}));
vi.mock('../messages', () => ({ rememberRequest: mocks.remember }));
import { queueOpenBotMentions } from '../queue-comment';
const bot = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  webhookUrl: 'https://hooks.example.test/routine',
  webhookSecret: 's'.repeat(40),
};
const comment = {
  id: '22222222-2222-4222-8222-222222222222',
  authorId: 'member',
  body: '@Research Bot help',
  parentId: null,
  targetObject: 'company',
  targetRecordId: 'record',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([bot]));
  vi.stubEnv('OPENBOT_REPLY_URL', 'https://crm.example.test/s/openbot/reply');
});
it('accepts generic Bot identities and keeps completed delivery state on replay', async () => {
  mocks.get.mockResolvedValue({ status: 'replied' });
  expect(
    await queueOpenBotMentions(
      comment,
      [{ id: bot.id, objectName: 'bot' }],
      'Company',
    ),
  ).toBe(true);
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.remember).toHaveBeenCalledOnce();
  expect(mocks.mutation).toHaveBeenCalledOnce();
});
it('does not queue a bot-authored reply or create a bot loop', async () => {
  expect(
    await queueOpenBotMentions(
      { ...comment, authorKind: 'BOT' },
      [{ id: bot.id, objectName: 'bot' }],
      'Company',
    ),
  ).toBe(false);
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.mutation).not.toHaveBeenCalled();
});

it('keeps private Inbox requests out of the public record receipt index', async () => {
  expect(
    await queueOpenBotMentions(
      { ...comment, inboxRequestId: 'grant' },
      [{ id: bot.id, objectName: 'externalAssistant' }],
      'Inbox Conversation',
    ),
  ).toBe(true);
  expect(mocks.remember).not.toHaveBeenCalled();
  expect(mocks.set).toHaveBeenCalled();
});
