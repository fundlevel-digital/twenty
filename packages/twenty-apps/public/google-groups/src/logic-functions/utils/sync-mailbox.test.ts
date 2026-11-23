import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from 'src/types/settings';

const mocks = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  request: vi.fn(),
  load: vi.fn(),
  active: vi.fn(),
  importMessage: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: async (key: string) => mocks.values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mocks.values.set(key, value);
    },
  },
}));
vi.mock('src/logic-functions/utils/preferences', () => ({
  loadPreferences: mocks.load,
  assertActiveRevision: mocks.active,
}));
vi.mock('src/logic-functions/utils/import-message', () => ({
  importMessage: mocks.importMessage,
}));
vi.mock('src/logic-functions/utils/google', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('src/logic-functions/utils/google')
  >()),
  googleRequest: mocks.request,
}));
import { GoogleApiError } from 'src/logic-functions/utils/google';
import { syncMailbox } from 'src/logic-functions/utils/sync-mailbox';

const group = {
  id: 'group',
  email: 'team@example.com',
  name: 'Team',
  visibility: 'SHARE_EVERYTHING',
  enabled: true,
};
describe('mailbox sync checkpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.clear();
    mocks.load.mockResolvedValue({
      revision: 'revision',
      settings: {
        ...DEFAULT_SETTINGS,
        connectionId: 'account',
        paused: false,
        groups: [group],
      },
    });
    mocks.active.mockResolvedValue(undefined);
    mocks.request.mockImplementation(
      async (_connectionId: string, path: string) => {
        if (path === '/profile')
          return { emailAddress: 'owner@example.com', historyId: '100' };
        if (path.startsWith('/messages?'))
          return { messages: [{ id: 'one' }], nextPageToken: 'next' };
        return {
          id: 'one',
          threadId: 'thread',
          internalDate: '1700000000000',
          payload: { headers: [{ name: 'To', value: group.email }] },
        };
      },
    );
  });
  it('does not call Google when paused', async () => {
    mocks.load.mockResolvedValue({
      revision: 'revision',
      settings: DEFAULT_SETTINGS,
    });
    expect(await syncMailbox()).toBeNull();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('stores the page cursor only after successful ingestion', async () => {
    await syncMailbox();
    expect(mocks.values.get('sync:revision')).toMatchObject({
      phase: 'BACKFILL',
      pageToken: 'next',
      historyId: '100',
      imported: 1,
    });
    expect(mocks.importMessage).toHaveBeenCalledTimes(1);
  });
  it('keeps the same history-window anchor while paginating', async () => {
    mocks.values.set('sync:revision', {
      revision: 'revision',
      phase: 'BACKFILL',
      historyId: '100',
      pageToken: 'previous',
      backfillStartedAt: 1700000000000,
      imported: 1,
    });
    await syncMailbox();
    const request = mocks.request.mock.calls.find((call) =>
      call[1].startsWith('/messages?'),
    );
    const parameters = new URL(request?.[1], 'https://example.com')
      .searchParams;
    expect(parameters.get('q')).toContain('after:1697408000');
    expect(parameters.get('pageToken')).toBe('previous');
  });
  it('keeps the old cursor when ingestion fails', async () => {
    mocks.importMessage.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(syncMailbox()).rejects.toThrow('Storage unavailable');
    expect(mocks.values.get('sync:revision')).toMatchObject({
      imported: 0,
      error: 'Storage unavailable',
    });
    expect(mocks.values.get('sync:revision')).not.toHaveProperty('pageToken');
  });
  it('does not import mail to a different recipient', async () => {
    mocks.request.mockImplementation(
      async (_connectionId: string, path: string) =>
        path === '/profile'
          ? { historyId: '100' }
          : path.startsWith('/messages?')
            ? { messages: [{ id: 'one' }] }
            : {
                id: 'one',
                payload: {
                  headers: [{ name: 'To', value: 'private@example.com' }],
                },
              },
    );
    await syncMailbox();
    expect(mocks.importMessage).not.toHaveBeenCalled();
  });
  it('resets an expired history cursor to a full backfill', async () => {
    mocks.values.set('sync:revision', {
      revision: 'revision',
      phase: 'IDLE',
      historyId: 'old',
      imported: 5,
    });
    mocks.request.mockImplementation(
      async (_connectionId: string, path: string) => {
        if (path === '/profile') return { historyId: '100' };
        throw new GoogleApiError(404);
      },
    );
    expect(await syncMailbox()).toMatchObject({
      phase: 'BACKFILL',
      imported: 5,
    });
    expect(mocks.values.get('sync:revision')).not.toHaveProperty('historyId');
  });
});
