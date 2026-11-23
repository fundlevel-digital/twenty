import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn(), register: vi.fn() }));
vi.mock('../native-assistants', () => ({
  nativeAssistantApi: mocks.api,
  registerNativeAssistant: mocks.register,
  NATIVE_ASSISTANT_HANDLER_ID: 'handler',
}));
import { syncNativeAssistants } from '../../logic-functions/openbot-sync-assistants';
const bot = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  avatarUrl: null,
  webhookUrl: 'https://hooks.example.test/routine',
  webhookSecret: 's'.repeat(40),
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([bot]));
});
it('reconciles renamed profiles and disables identities whose connection was removed', async () => {
  mocks.api
    .mockResolvedValueOnce({
      ownExternalAssistants: [
        {
          id: bot.id,
          agentId: bot.id,
          name: 'Old Name',
          avatarUrl: null,
          enabled: true,
        },
        { id: 'removed', name: 'Retired Bot', avatarUrl: null, enabled: true },
      ],
    })
    .mockResolvedValue({});
  expect(await syncNativeAssistants()).toEqual({ updated: 2 });
  expect(mocks.register).toHaveBeenCalledWith(
    expect.objectContaining({ id: bot.id, name: bot.name }),
  );
  expect(mocks.api.mock.calls[1][1].input).toMatchObject({
    id: 'removed',
    enabled: false,
    handlerUniversalIdentifier: 'handler',
  });
});
it('does not rewrite identities whose saved configuration already matches', async () => {
  mocks.api.mockResolvedValue({
    ownExternalAssistants: [
      {
        id: bot.id,
        agentId: bot.id,
        name: bot.name,
        avatarUrl: null,
        enabled: true,
      },
    ],
  });
  expect(await syncNativeAssistants()).toEqual({ updated: 0 });
  expect(mocks.register).not.toHaveBeenCalled();
  expect(mocks.api).toHaveBeenCalledTimes(1);
});
