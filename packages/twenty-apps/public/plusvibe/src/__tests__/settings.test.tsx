import { DEFAULT_PREFERENCES } from 'src/constants/preferences';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, query, navigate, enqueueSnackbar, viewOptions } = vi.hoisted(
  () => ({
    get: vi.fn(),
    post: vi.fn(),
    query: vi.fn(),
    navigate: vi.fn(),
    enqueueSnackbar: vi.fn(),
    viewOptions: { colorScheme: 'light' as 'light' | 'dark' },
  }),
);
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = query;
  },
}));
vi.mock('twenty-client-sdk/rest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-client-sdk/rest')>()),
  RestApiClient: class {
    get = get;
    post = post;
  },
}));
vi.mock('twenty-sdk/front-component', () => ({
  t: (value: string) => value,
  navigate,
  enqueueSnackbar,
  useColorScheme: () => viewOptions.colorScheme,
  AppPath: { SettingsCatchAll: '/settings/*' },
  useLocation: () => ({
    pathname: '/settings/app-preferences/app-1',
    search: '',
    hash: '#setup',
  }),
}));

import { type PlusvibeSettingsStatus } from 'src/constants/plusvibe';
import { PlusvibeSettings } from 'src/front-components/PlusvibeSettings';

let status: PlusvibeSettingsStatus;

beforeEach(() => {
  vi.resetAllMocks();
  status = {
    isApiKeySet: true,
    isMailConnected: true,
    selectedWorkspaceIds: ['workspace-1'],
    workspaces: [
      { _id: 'workspace-1', name: 'Outbound sales' },
      { _id: 'workspace-2', name: 'Agency North America' },
    ],
    imports: {
      'workspace-1': {
        runId: 'run-1',
        phase: 'complete',
        processed: 50,
        updatedAt: '2026-11-20T10:00:00Z',
      },
    },
  };
  query.mockResolvedValue({ findOneApplication: { id: 'app-1' } });
  get.mockImplementation(async () => status);
  post.mockImplementation(
    async (path: string, body: { workspaceIds?: string[] }) => {
      if (body.workspaceIds)
        status = { ...status, selectedWorkspaceIds: body.workspaceIds };
      return { success: true };
    },
  );
});
afterEach(cleanup);

const renderSettings = (colorScheme: 'light' | 'dark' = 'light') => {
  viewOptions.colorScheme = colorScheme;
  return render(<PlusvibeSettings />);
};

describe('PlusVibe settings', () => {
  it.each(['light', 'dark'] as const)(
    'saves only the workspaces selected by the user in %s mode',
    async (colorScheme) => {
      const user = userEvent.setup();
      renderSettings(colorScheme);
      await screen.findByText('Agency North America');
      await user.click(screen.getByRole('button', { name: 'Select' }));
      await user.click(screen.getByRole('button', { name: 'Save Changes' }));
      await screen.findByText('Sync settings saved.');
      expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
        workspaceIds: ['workspace-1', 'workspace-2'],
      });
    },
  );

  it('stops syncing and unlocks account reconnection', async () => {
    const user = userEvent.setup();
    renderSettings();
    await screen.findByText('Outbound sales');
    expect(
      screen
        .getByRole('button', { name: 'Reconnect PlusVibe' })
        .hasAttribute('disabled'),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Stop Syncing' }));
    await screen.findByText('Sync stopped. Existing records are kept.');
    expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
      workspaceIds: [],
    });
    expect(
      screen
        .getByRole('button', { name: 'Reconnect PlusVibe' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('starts with one native API-key connection and returns to the setup page', async () => {
    status = {
      ...status,
      isApiKeySet: false,
      isMailConnected: false,
      selectedWorkspaceIds: [],
    };
    renderSettings();
    await screen.findByRole('button', { name: 'Connect PlusVibe' });
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Connect PlusVibe' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(screen.queryByText('Workspaces')).toBeNull();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Connect PlusVibe' }));
    expect(navigate).toHaveBeenCalledWith(
      '/settings/*',
      { '*': 'applications/app-1/connect/plusvibe-user' },
      undefined,
      {
        state: { returnTo: '/settings/app-preferences/app-1#setup' },
        surface: 'main',
      },
    );
    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('API key')).toBeNull();
  });

  it('enables sync only after the user explicitly selects workspaces', async () => {
    status = { ...status, selectedWorkspaceIds: [], imports: {} };
    renderSettings();
    await screen.findByRole('button', { name: 'Enable Sync' });
    expect(
      screen
        .getByRole('button', { name: 'Enable Sync' })
        .hasAttribute('disabled'),
    ).toBe(true);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]);
    await user.click(screen.getByRole('button', { name: 'Enable Sync' }));
    await screen.findByText('Sync enabled. Import started.');
    expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
      workspaceIds: ['workspace-1'],
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reconnects the same native account instead of adding a duplicate', async () => {
    status = {
      ...status,
      selectedWorkspaceIds: [],
      accountConnectionId: 'connection-1',
    };
    renderSettings();
    await screen.findByRole('button', { name: 'Reconnect PlusVibe' });
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Reconnect PlusVibe' }));
    expect(navigate).toHaveBeenCalledWith(
      '/settings/*',
      expect.anything(),
      { reconnectingConnectedAccountId: 'connection-1' },
      expect.anything(),
    );
  });

  it('can stop sync and reconnect even when the provider credential stops working', async () => {
    status = {
      ...status,
      hasAccountError: true,
      isMailConnected: false,
      workspaces: [],
    };
    renderSettings();
    await screen.findByText(
      'Could not verify the PlusVibe account. Refresh or reconnect to continue.',
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Stop Syncing' }));
    await screen.findByText('Sync stopped. Existing records are kept.');
    expect(
      screen
        .getByRole('button', { name: 'Reconnect PlusVibe' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('adds a second key while sync is active and saves each connection independently', async () => {
    status = {
      ...status,
      accounts: [
        {
          id: 'connection-1',
          name: 'PlusVibe #1',
          hasAccountError: false,
          isMailConnected: true,
          workspaces: [status.workspaces[0]],
          selectedWorkspaceIds: ['workspace-1'],
        },
        {
          id: 'connection-2',
          name: 'PlusVibe #2',
          hasAccountError: false,
          isMailConnected: true,
          workspaces: [status.workspaces[1]],
          selectedWorkspaceIds: [],
        },
      ],
    };
    const user = userEvent.setup();
    renderSettings();
    await screen.findByRole('button', { name: 'PlusVibe #2' });
    await user.click(screen.getByRole('button', { name: 'Add Connection' }));
    expect(navigate).toHaveBeenCalledWith(
      '/settings/*',
      { '*': 'applications/app-1/connect/plusvibe-user' },
      undefined,
      expect.anything(),
    );
    await user.click(screen.getByRole('button', { name: 'PlusVibe #2' }));
    await screen.findByText('Agency North America');
    expect(screen.queryByText('Outbound sales')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Enable Sync' }));
    expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
      accountConnectionId: 'connection-2',
      workspaceIds: ['workspace-2'],
    });
  });

  it('does not select an overlapping workspace for a second connection', async () => {
    status = {
      ...status,
      accounts: [
        {
          id: 'connection-1',
          name: 'PlusVibe #1',
          hasAccountError: false,
          isMailConnected: true,
          workspaces: [status.workspaces[0]],
          selectedWorkspaceIds: ['workspace-1'],
        },
        {
          id: 'connection-2',
          name: 'PlusVibe #2',
          hasAccountError: false,
          isMailConnected: true,
          workspaces: [status.workspaces[0]],
          selectedWorkspaceIds: [],
        },
      ],
    };
    renderSettings();
    await screen.findByRole('button', { name: 'PlusVibe #2' });
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'PlusVibe #2' }));
    expect(screen.getByRole('button', { name: 'Select' })).toBeDefined();
    expect(
      screen
        .getByRole('button', { name: 'Enable Sync' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it('allows retry after a failed settings request', async () => {
    get.mockRejectedValueOnce(new Error('Unavailable'));
    renderSettings();
    await screen.findByText(
      'Could not load your PlusVibe connection. Try again.',
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Outbound sales');
    expect(
      screen.queryByText('Could not load your PlusVibe connection. Try again.'),
    ).toBeNull();
  });

  it('reports failed saves without displaying success', async () => {
    post.mockRejectedValueOnce(new Error('Provider unavailable'));
    renderSettings();
    await screen.findByText('Outbound sales');
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(
        screen.getByText('Could not save your changes. Try again.'),
      ).toBeDefined(),
    );
    expect(screen.queryByText('Sync settings saved.')).toBeNull();
  });
});

it('saves import and sharing preferences for the active connection and restores each account’s values', async () => {
  status = {
    ...status,
    accounts: [
      {
        id: 'connection-1',
        name: 'PlusVibe #1',
        hasAccountError: false,
        isMailConnected: true,
        workspaces: [],
        selectedWorkspaceIds: [],
        preferences: {
          ...DEFAULT_PREFERENCES,
          contactAutoCreationPolicy: 'SENT_AND_RECEIVED',
          uniboxVisibility: 'METADATA',
        },
      },
      {
        id: 'connection-2',
        name: 'PlusVibe #2',
        hasAccountError: false,
        isMailConnected: true,
        workspaces: [],
        selectedWorkspaceIds: [],
        preferences: {
          ...DEFAULT_PREFERENCES,
          contactAutoCreationPolicy: 'NONE',
          uniboxVisibility: 'SUBJECT',
        },
      },
    ],
  };
  renderSettings();
  const user = userEvent.setup();
  await screen.findByRole('button', { name: 'PlusVibe #2' });
  await user.click(screen.getByRole('button', { name: 'PlusVibe #2' }));
  expect(
    screen.getByRole('radio', { name: 'None' }).getAttribute('aria-checked'),
  ).toBe('true');
  expect(
    screen.getByRole('radio', { name: 'Subject' }).getAttribute('aria-checked'),
  ).toBe('true');
  await user.click(screen.getByRole('radio', { name: 'Everything' }));
  await waitFor(() =>
    expect(enqueueSnackbar).toHaveBeenCalledWith({
      message: 'Preferences saved.',
      variant: 'success',
    }),
  );
  expect(post).toHaveBeenCalledWith('/s/plusvibe/preferences', {
    accountConnectionId: 'connection-2',
    ...DEFAULT_PREFERENCES,
    contactAutoCreationPolicy: 'NONE',
    uniboxVisibility: 'SHARE_EVERYTHING',
  });
  expect(get).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'PlusVibe #1' }));
  expect(
    screen
      .getByRole('radio', { name: 'Sent and Received' })
      .getAttribute('aria-checked'),
  ).toBe('true');
  expect(
    screen
      .getByRole('radio', { name: 'Metadata Only' })
      .getAttribute('aria-checked'),
  ).toBe('true');
});

it('shows a retry action instead of default preferences or a false disconnected account after loading fails', async () => {
  get.mockRejectedValueOnce(new Error('Unavailable'));
  renderSettings();
  await screen.findByText(
    'Could not load your PlusVibe connection. Try again.',
  );
  expect(screen.queryByRole('button', { name: 'Connect PlusVibe' })).toBeNull();
  expect(
    screen.queryByRole('radiogroup', { name: 'People Auto-Creation' }),
  ).toBeNull();
  expect(
    screen.queryByRole('radiogroup', { name: 'Unibox Sharing' }),
  ).toBeNull();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('Outbound sales');
});

it('restores the previous preference and reports the failure if an immediate save fails', async () => {
  status = {
    ...status,
    accounts: [
      {
        id: 'connection-1',
        name: 'PlusVibe #1',
        hasAccountError: false,
        isMailConnected: true,
        workspaces: [],
        selectedWorkspaceIds: [],
        preferences: {
          ...DEFAULT_PREFERENCES,
          contactAutoCreationPolicy: 'SENT_AND_RECEIVED',
          uniboxVisibility: 'METADATA',
        },
      },
    ],
  };
  post.mockRejectedValueOnce(new Error('Unavailable'));
  renderSettings();
  const toggle = await screen.findByRole('switch', {
    name: 'Exclude Internal Employees',
  });
  await userEvent.setup().click(toggle);
  await waitFor(() =>
    expect(enqueueSnackbar).toHaveBeenCalledWith({
      message: 'Could not save your preferences. Try again.',
      variant: 'error',
    }),
  );
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  expect(enqueueSnackbar).not.toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'success' }),
  );
});

it('saves the email-style creation policy and validates explicit employee domains', async () => {
  status = {
    ...status,
    accounts: [
      {
        id: 'connection-1',
        name: 'PlusVibe #1',
        hasAccountError: false,
        isMailConnected: true,
        workspaces: [],
        selectedWorkspaceIds: [],
        preferences: { ...DEFAULT_PREFERENCES },
      },
    ],
  };
  renderSettings();
  const user = userEvent.setup();
  await screen.findByRole('radio', { name: 'Sent' });
  await user.click(screen.getByRole('radio', { name: 'Sent' }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith('/s/plusvibe/preferences', {
      ...DEFAULT_PREFERENCES,
      accountConnectionId: 'connection-1',
      contactAutoCreationPolicy: 'SENT',
    }),
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole('button', { name: 'Save Domains' })
        .hasAttribute('disabled'),
    ).toBe(false),
  );
  const input = screen.getByRole('textbox', { name: 'Internal Domains' });
  await user.type(input, 'Mail.ACME.com; acme.com; example.ai');
  await user.click(screen.getByRole('button', { name: 'Save Domains' }));
  await waitFor(() =>
    expect(post).toHaveBeenLastCalledWith('/s/plusvibe/preferences', {
      ...DEFAULT_PREFERENCES,
      accountConnectionId: 'connection-1',
      contactAutoCreationPolicy: 'SENT',
      internalDomains: ['mail.acme.com', 'acme.com', 'example.ai'],
    }),
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole('button', { name: 'Save Domains' })
        .hasAttribute('disabled'),
    ).toBe(false),
  );
  await user.clear(screen.getByRole('textbox', { name: 'Internal Domains' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Internal Domains' }),
    'https://bad-domain',
  );
  const calls = post.mock.calls.length;
  await user.click(screen.getByRole('button', { name: 'Save Domains' }));
  await screen.findByText('Enter valid domains separated by commas.');
  expect(post).toHaveBeenCalledTimes(calls);
});
