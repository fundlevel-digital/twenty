import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type InboxSummary } from 'src/logic-functions/utils/update-inbox-summary';

const mocks = vi.hoisted(() => ({
  values: new Map<string, InboxSummary>(),
  patch: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: async (key: string) => mocks.values.get(key) ?? null,
    set: async (key: string, value: InboxSummary) => {
      mocks.values.set(key, value);
    },
  },
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    patch = mocks.patch;
  },
}));
import { updateInboxSummary } from 'src/logic-functions/utils/update-inbox-summary';

const options = {
  groupId: 'team',
  mailbox: 'team@example.com',
  providerThreadId: 'provider-thread',
  threadId: 'native-thread',
  senderHandle: 'sender@example.com',
  message: {
    id: 'latest',
    receivedAt: '2026-11-23T10:00:00.000Z',
    sender: 'Sender',
    attachments: 2,
  },
};
describe('inbox conversation summaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.clear();
    mocks.patch.mockResolvedValue({});
  });
  it('keeps the latest received sender and date when older history arrives later', async () => {
    await updateInboxSummary(options);
    await updateInboxSummary({
      ...options,
      message: {
        id: 'older',
        receivedAt: '2025-01-01T10:00:00.000Z',
        sender: 'Earlier Sender',
        attachments: 1,
      },
    });
    expect(mocks.patch).toHaveBeenLastCalledWith(
      '/rest/messageThreads/native-thread',
      {
        googleGroupsMailbox: 'team@example.com',
        googleGroupsSender: 'Sender',
        googleGroupsReceivedAt: options.message.receivedAt,
        googleGroupsAttachments: 3,
      },
    );
  });
  it('does not count attachments again when the same message is replayed', async () => {
    await updateInboxSummary(options);
    await updateInboxSummary(options);
    expect(mocks.patch.mock.calls.at(-1)?.[1].googleGroupsAttachments).toBe(2);
  });
  it('keeps outgoing Group messages out of received-mail summaries', async () => {
    await updateInboxSummary({ ...options, senderHandle: 'TEAM@example.com' });
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.values.size).toBe(0);
  });
  it('preserves the checkpoint when the native record update fails', async () => {
    mocks.patch.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(updateInboxSummary(options)).rejects.toThrow('Unavailable');
    expect(mocks.values.size).toBe(0);
    await updateInboxSummary(options);
    expect(mocks.values.size).toBe(1);
  });
});
