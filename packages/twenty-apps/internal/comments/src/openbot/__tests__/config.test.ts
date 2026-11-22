import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn() }));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = mocks.query;
    mutation = mocks.mutation;
  },
}));
import { openBotConfigHandler } from '../../logic-functions/openbot-config';
import { readBotDirectory } from '../../logic-functions/openbot-directory';
import { getOpenBotConnections } from '../connections';
const bot = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  webhookUrl: 'https://hooks.example.test/research',
  webhookSecret: 's'.repeat(40),
};
const context = { workspaceMemberId: 'member' } as Parameters<
  typeof openBotConfigHandler
>[1];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('OPENBOT_CONNECTIONS', JSON.stringify([bot]));
  mocks.query.mockImplementation(async (input) =>
    input.currentUser
      ? {
          currentUser: {
            currentUserWorkspace: { permissionFlags: ['APPLICATIONS'] },
          },
        }
      : { findOneApplication: { id: 'app' } },
  );
  mocks.mutation.mockResolvedValue({});
});
it('requires the member’s Apps permission to read settings', async () => {
  await expect(
    openBotConfigHandler(
      { action: 'list' },
      { ...context, workspaceMemberId: null },
    ),
  ).rejects.toThrow('Sign in');
  mocks.query.mockResolvedValue({
    currentUser: { currentUserWorkspace: { permissionFlags: [] } },
  });
  await expect(
    openBotConfigHandler({ action: 'list' }, context),
  ).rejects.toThrow('Apps permission');
  expect(mocks.mutation).not.toHaveBeenCalled();
});
it('returns only a configured flag for secrets and public identities for the picker', async () => {
  const result = await openBotConfigHandler({ action: 'list' }, context);
  expect(JSON.stringify(result)).not.toContain(bot.webhookSecret);
  expect(result).toMatchObject({ bots: [{ hasSecret: true, enabled: true }] });
  expect(readBotDirectory({}, context)).toEqual([
    { id: bot.id, name: bot.name, avatarUrl: null, enabled: true },
  ]);
});
it('preserves a blank secret and excludes disabled bots from delivery', async () => {
  const result = await openBotConfigHandler({ action: 'list' }, context);
  await openBotConfigHandler(
    {
      action: 'save',
      revision: 'revision' in result ? result.revision : '',
      bot: { ...bot, webhookSecret: '', enabled: false },
    },
    context,
  );
  const update =
    mocks.mutation.mock.calls[0][0].updateOneApplicationVariable.__args;
  expect(update.key).toBe('OPENBOT_CONNECTIONS');
  expect(JSON.parse(update.value)[0]).toMatchObject({
    webhookSecret: bot.webhookSecret,
    enabled: false,
  });
  vi.stubEnv('OPENBOT_CONNECTIONS', update.value);
  expect(getOpenBotConnections()).toEqual([]);
  expect(readBotDirectory({}, context)[0].enabled).toBe(false);
});
it('rejects stale saves, insecure URLs, short secrets and invalid intervals', async () => {
  const result = await openBotConfigHandler({ action: 'list' }, context);
  const revision = 'revision' in result ? result.revision : '';
  await expect(
    openBotConfigHandler({ action: 'remove', revision: 'stale', bot }, context),
  ).rejects.toThrow('Reload');
  await expect(
    openBotConfigHandler(
      {
        action: 'save',
        revision,
        bot: { ...bot, webhookUrl: 'http://hooks.example.test' },
      },
      context,
    ),
  ).rejects.toThrow('HTTPS');
  await expect(
    openBotConfigHandler(
      { action: 'save', revision, bot: { ...bot, webhookSecret: 'short' } },
      context,
    ),
  ).rejects.toThrow('Invalid');
  await expect(
    openBotConfigHandler(
      {
        action: 'save',
        revision,
        bot: { ...bot, taskPolicy: { warningMinutes: 0 } },
      },
      context,
    ),
  ).rejects.toThrow('interval');
  expect(mocks.mutation).not.toHaveBeenCalled();
});
