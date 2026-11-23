import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsResponse,
} from 'src/types/settings';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  translate: (text: string) => text,
}));
vi.mock('twenty-sdk/front-component', () => ({
  useTranslate: () => ({ t: mocks.translate }),
  useColorScheme: () => 'light',
  copyToClipboard: vi.fn(),
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    post = mocks.post;
    resolveUrl = () => 'https://preview.example.com/auth/apps/callback';
  },
  RestApiClientError: class extends Error {},
}));
import { GoogleGroupsSettings } from 'src/front-components/components/GoogleGroupsSettings';

const response = (settings: Settings = DEFAULT_SETTINGS): SettingsResponse => ({
  revision: 'initial',
  settings,
  canManage: true,
  connections: [],
  channels: [],
  status: null,
});
describe('Google Groups setup', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.post.mockImplementation(
      async (_path: string, body: { action: string; settings?: Settings }) =>
        response(body.settings ?? DEFAULT_SETTINGS),
    );
  });
  it('shows the setup checklist and keeps sync unavailable without credentials', async () => {
    render(<GoogleGroupsSettings />);
    await screen.findByText('No Google Workspace Account Connected');
    expect(
      screen.getByText('https://preview.example.com/auth/apps/callback'),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Sync Now' }).hasAttribute('disabled'),
    ).toBe(true);
  });
  it('saves a Group draft without connecting or starting a sync', async () => {
    const user = userEvent.setup();
    render(<GoogleGroupsSettings />);
    await user.click(await screen.findByRole('button', { name: 'Add Group' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Channel Name' }),
      'Acme Team',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Group Email Address' }),
      'team@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Save Preferences' }));
    await screen.findByText('Preferences Saved');
    expect(mocks.post).toHaveBeenCalledWith(
      '/s/google-groups/settings',
      expect.objectContaining({
        action: 'save',
        settings: expect.objectContaining({
          paused: true,
          connectionId: null,
          groups: [
            expect.objectContaining({
              name: 'Acme Team',
              email: 'team@example.com',
              visibility: 'METADATA',
            }),
          ],
        }),
      }),
    );
    expect(
      mocks.post.mock.calls.some((call) => call[1].action === 'sync'),
    ).toBe(false);
  });
  it('displays a failed save without pretending it succeeded', async () => {
    const user = userEvent.setup();
    render(<GoogleGroupsSettings />);
    await user.click(await screen.findByRole('button', { name: 'Add Group' }));
    mocks.post.mockRejectedValueOnce(
      new Error('Settings changed. Reload before saving.'),
    );
    await user.click(screen.getByRole('button', { name: 'Save Preferences' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Settings changed',
      ),
    );
    expect(screen.queryByText('Preferences Saved')).toBeNull();
  });
  it('saves a contact creation policy without starting an import', async () => {
    const user = userEvent.setup();
    render(<GoogleGroupsSettings />);
    const select = await screen.findByRole('combobox', {
      name: 'Create Missing Contacts',
    });
    expect(select.textContent).toContain('Never');
    await user.click(select);
    await user.click(
      await screen.findByRole('option', { name: 'Senders Only' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save Preferences' }));
    await screen.findByText('Preferences Saved');
    expect(mocks.post).toHaveBeenCalledWith(
      '/s/google-groups/settings',
      expect.objectContaining({
        action: 'save',
        settings: expect.objectContaining({ contactCreation: 'SENDERS' }),
      }),
    );
    expect(
      mocks.post.mock.calls.some((call) => call[1].action === 'sync'),
    ).toBe(false);
  });
});
