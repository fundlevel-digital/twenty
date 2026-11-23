import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => vi.fn());
vi.mock('../native-assistants', () => ({ nativeAssistantApi: api }));
import { runOpenBotAgent } from '../../logic-functions/openbot-run-agent';
const id = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv(
    'OPENBOT_CONNECTIONS',
    JSON.stringify([
      {
        id,
        name: 'Fixture',
        webhookUrl: 'https://hooks.example.test/routine',
        webhookSecret: 's'.repeat(40),
      },
    ]),
  );
  api.mockResolvedValue({
    runAgent: { status: 'RUNNING', runId: 'run', threadId: 'thread' },
  });
});
it('uses the native Agent API with the validated member context', async () => {
  await expect(
    runOpenBotAgent({ agentId: id, prompt: 'Work' }, {
      workspaceMemberId: 'member',
    } as never),
  ).resolves.toMatchObject({ status: 'RUNNING' });
  expect(api).toHaveBeenCalledWith(expect.stringContaining('runAgent'), {
    input: {
      agentUniversalIdentifier: id,
      input: [{ role: 'user', content: 'Work' }],
      runAsWorkspaceMemberId: 'member',
      waitForCompletion: false,
    },
  });
});
it('rejects missing member context and agents outside this app', async () => {
  await expect(
    runOpenBotAgent({ agentId: id, prompt: 'Work' }, {} as never),
  ).rejects.toThrow('workspace member');
  await expect(
    runOpenBotAgent({ agentId: 'other', prompt: 'Work' }, {
      workspaceMemberId: 'member',
    } as never),
  ).rejects.toThrow('unavailable');
  expect(api).not.toHaveBeenCalled();
});
