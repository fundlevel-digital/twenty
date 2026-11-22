import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ set: vi.fn(), enqueue: vi.fn() }));
vi.mock('twenty-sdk/logic-function', () => ({ kv: { set: mocks.set } }));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    mutation = mocks.enqueue;
  },
}));
import { queueOpenBotMentions } from '../queue-comment';

const agent = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  webhookUrl: 'https://hooks.example.com/research',
  webhookSecret: 'whsec_abcdefghijklmnopqrstuvwxyz1234567890',
};
const comment = {
  id: '22222222-2222-4222-8222-222222222222',
  body: '@Research Bot research Acme',
  authorId: '33333333-3333-4333-8333-333333333333',
  parentId: null,
  targetObject: 'company',
  targetRecordId: '44444444-4444-4444-8444-444444444444',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([agent]));
  vi.stubEnv(
    'OPENBOT_REPLY_URL',
    'https://crm.example.com/s/comments/openbot/reply',
  );
});

describe('OpenBot mention delivery', () => {
  it('does not trigger bots from bot-authored replies', async () => {
    expect(
      await queueOpenBotMentions(
        { ...comment, authorKind: 'BOT' },
        [{ id: agent.id, objectName: 'openbotAgent' }],
        'Acme',
      ),
    ).toBe(false);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it('deduplicates selected bots and saves task metadata before enqueueing', async () => {
    const mention = { id: agent.id, objectName: 'openbotAgent' };
    await queueOpenBotMentions(comment, [mention, mention], 'Acme');
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.set.mock.calls[0][1]).toMatchObject({
      status: 'pending',
      task: { threadId: comment.id, requestedBy: comment.authorId },
    });
    expect(JSON.stringify(mocks.set.mock.calls)).not.toContain(
      agent.webhookSecret,
    );
    expect(
      mocks.enqueue.mock.calls[0][0].enqueueJobs.__args.input.jobs,
    ).toHaveLength(1);
    expect(mocks.set.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.enqueue.mock.invocationCallOrder[0],
    );
  });
  it('routes a reply mention into its existing parent thread', async () => {
    await queueOpenBotMentions(
      { ...comment, parentId: 'root-thread' },
      [{ id: agent.id, objectName: 'openbotAgent' }],
      'Acme',
    );
    expect(mocks.set.mock.calls[0][1].task.threadId).toBe('root-thread');
  });
  it('ignores human mentions and unknown bot IDs', async () => {
    expect(
      await queueOpenBotMentions(
        comment,
        [
          { id: agent.id, objectName: 'workspaceMember' },
          { id: 'unknown', objectName: 'openbotAgent' },
        ],
        'Acme',
      ),
    ).toBe(false);
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
