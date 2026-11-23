import { AgentRunnerService } from '../agent-runner.service';
import { EXTERNAL_APPLICATION_AGENT_MODEL_ID } from 'twenty-shared/ai';

it('runs a member-scoped external workflow agent through its adapter with zero native model usage', async () => {
  const runtime = { run: jest.fn() };
  const persona = { resolveOrThrow: jest.fn() };
  const service = {
    nativeApplicationAgents: {
      find: jest.fn().mockResolvedValue({
        id: 'agent',
        modelId: EXTERNAL_APPLICATION_AGENT_MODEL_ID,
      }),
    },
    nativeApplicationRuntime: runtime,
    nativeApplicationSettlements: {
      waitFor: jest
        .fn()
        .mockResolvedValue({ status: 'COMPLETED', result: { text: 'Answer' } }),
    },
    agentRunPersonaService: persona,
  };
  const result = await AgentRunnerService.prototype.runInRequest.call(
    service as never,
    {
      workspaceId: 'workspace',
      spec: { agentId: 'agent' },
      executionContext: {
        authContext: {
          type: 'user',
          workspaceMemberId: 'member',
          userWorkspaceId: 'membership',
        },
      },
      prompt: { messages: [{ role: 'user', content: 'Work' }] },
    } as never,
  );
  expect(result).toMatchObject({
    outcome: { status: 'COMPLETED', result: { text: 'Answer' } },
    usage: { inputTokens: 0, outputTokens: 0 },
  });
  expect(runtime.run).toHaveBeenCalledWith(
    expect.objectContaining({ agentId: 'agent', text: 'Work' }),
  );
  expect(persona.resolveOrThrow).not.toHaveBeenCalled();
});
