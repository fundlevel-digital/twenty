import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  navigate: vi.fn(),
  confirmation: vi.fn(),
  search: '',
  listeners: new Set<() => void>(),
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = async () => ({
      findManyLogicFunctions: [
        {
          id: 'config',
          universalIdentifier: '0746fe46-b2ed-58f6-a1cf-896c36f68e88',
        },
      ],
    });
    mutation = mocks.mutation;
  },
}));
vi.mock('twenty-sdk/front-component', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useTranslate: () => ({ t: (text: string) => text }),
    useColorScheme: () => 'light',
    useLocation: () => ({
      pathname: '/settings/apps/comments/openbot',
      hash: '#openbot',
      search: useSyncExternalStore(
        (listener) => {
          mocks.listeners.add(listener);
          return () => {
            mocks.listeners.delete(listener);
          };
        },
        () => mocks.search,
      ),
    }),
    navigate: mocks.navigate,
    AppPath: { SettingsCatchAll: '/settings/*' },
    openCommandConfirmationModal: mocks.confirmation,
  };
});
import { OpenBotSettings } from './OpenBotSettings';
const bot = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Research Bot',
  avatarUrl: null,
  webhookUrl: 'https://hooks.example.test',
  hasSecret: true,
  enabled: true,
  taskPolicy: {
    onAssigned: false,
    onDue: false,
    warningMinutes: null,
    overdueEveryMinutes: null,
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.search = '';
  mocks.navigate.mockImplementation(async (_path, params) => {
    const url = new URL(`https://example.test/settings/${params['*']}`);
    mocks.search = url.search;
    mocks.listeners.forEach((listener) => listener());
  });
  mocks.mutation.mockImplementation(async (input) => {
    const payload = input.executeOneLogicFunction.__args.input.payload;
    return {
      executeOneLogicFunction: {
        status: 'SUCCESS',
        data:
          payload.action === 'list'
            ? {
                revision: 'revision',
                replyUrl: 'https://crm.example.test/s/openbot/reply',
                bots: [bot],
              }
            : { saved: true, id: bot.id },
      },
    };
  });
});
afterEach(cleanup);
it('opens a separate bot config page, keeps the secret empty and saves a reminder policy', async () => {
  const user = userEvent.setup();
  render(<OpenBotSettings />);
  await user.click(await screen.findByText('Research Bot'));
  expect(mocks.navigate.mock.calls[0][1]['*']).toContain('#openbot');
  const name = await screen.findByRole('textbox', { name: 'Bot Name' });
  expect((name as HTMLInputElement).value).toBe('Research Bot');
  expect(
    (screen.getByLabelText('Webhook Secret') as HTMLInputElement).value,
  ).toBe('');
  await user.click(
    screen.getByRole('switch', { name: 'Notify When Assigned' }),
  );
  await user.click(screen.getByRole('switch', { name: 'Enable Due Warning' }));
  const minutes = screen.getByRole('spinbutton', { name: 'Warning Minutes' });
  await user.clear(minutes);
  await user.type(minutes, '15');
  await user.click(screen.getByRole('button', { name: 'Save Bot' }));
  await waitFor(() =>
    expect(mocks.mutation).toHaveBeenCalledWith(
      expect.objectContaining({
        executeOneLogicFunction: expect.objectContaining({
          __args: expect.objectContaining({
            input: expect.objectContaining({
              payload: expect.objectContaining({
                action: 'save',
                bot: expect.objectContaining({
                  webhookSecret: '',
                  taskPolicy: expect.objectContaining({
                    onAssigned: true,
                    warningMinutes: 15,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    ),
  );
});
it('keeps a dirty draft when native discard confirmation is cancelled', async () => {
  mocks.search = `?openBotId=${bot.id}`;
  mocks.confirmation.mockResolvedValue('cancel');
  const user = userEvent.setup();
  render(<OpenBotSettings />);
  await user.type(
    await screen.findByRole('textbox', { name: 'Bot Name' }),
    ' Edited',
  );
  await user.click(screen.getByRole('button', { name: 'All Bots' }));
  expect(mocks.confirmation).toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(
    (screen.getByRole('textbox', { name: 'Bot Name' }) as HTMLInputElement)
      .value,
  ).toBe('Research Bot Edited');
});
it('shows backend permission errors without exposing an editable configuration', async () => {
  mocks.mutation.mockResolvedValue({
    executeOneLogicFunction: {
      status: 'ERROR',
      error: { errorMessage: 'Apps permission is required to manage bots' },
    },
  });
  render(<OpenBotSettings />);
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Apps permission',
  );
  expect(screen.queryByRole('textbox', { name: 'Webhook URL' })).toBeNull();
});
