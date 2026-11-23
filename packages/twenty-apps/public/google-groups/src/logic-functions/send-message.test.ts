import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type SendAppMessagePayload } from 'twenty-sdk/logic-function';
import { DEFAULT_SETTINGS } from 'src/types/settings';

const mocks = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  request: vi.fn(),
  preferences: vi.fn(),
  channels: vi.fn(),
}));
vi.mock('twenty-sdk/define', () => ({
  defineLogicFunction: (value: unknown) => value,
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: async (key: string) => mocks.values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mocks.values.set(key, value);
    },
  },
  listMessageChannels: mocks.channels,
}));
vi.mock('src/logic-functions/utils/preferences', () => ({
  loadPreferences: mocks.preferences,
}));
vi.mock('src/logic-functions/utils/google', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('src/logic-functions/utils/google')
  >()),
  googleRequest: mocks.request,
}));
import { sendMessage } from 'src/logic-functions/send-message';

const group = {
  id: 'group',
  email: 'team@example.com',
  name: 'Team',
  visibility: 'SHARE_EVERYTHING',
  enabled: true,
};
const payload: SendAppMessagePayload = {
  conversationStyle: 'email',
  messagingProviderName: 'google-groups-mail',
  connectedAccountId: 'account',
  messageChannelId: 'channel',
  threadExternalId: 'group:thread',
  idempotencyKey: 'delivery',
  text: 'Reply body',
  recipients: [{ handle: 'customer@example.com', displayName: 'Customer' }],
  attachments: [],
  email: {
    subject: 'Re: Question',
    html: '<p>Reply body</p>',
    cc: [],
    bcc: [{ handle: 'archive@example.com', displayName: null }],
    inReplyToExternalId: 'group:original',
  },
};

describe('Gmail reply transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.clear();
    mocks.preferences.mockResolvedValue({
      revision: 'revision',
      settings: {
        ...DEFAULT_SETTINGS,
        connectionId: 'account',
        paused: false,
        groups: [group],
      },
    });
    mocks.channels.mockResolvedValue([{ id: 'channel', handle: group.email }]);
    mocks.values.set('message:group:original', {
      googleId: 'original',
      threadId: 'thread',
      headerMessageId: '<original@example.com>',
      references: '<earlier@example.com>',
    });
    mocks.request.mockImplementation(
      async (_connectionId: string, path: string) =>
        path === '/settings/sendAs'
          ? {
              sendAs: [
                { sendAsEmail: group.email, verificationStatus: 'accepted' },
              ],
            }
          : { id: 'sent', threadId: 'thread' },
    );
  });
  it('sends as the verified Group with Gmail thread and MIME reply headers', async () => {
    expect(await sendMessage(payload)).toMatchObject({
      externalId: 'group:sent',
    });
    const call = mocks.request.mock.calls.find(
      (call) => call[1] === '/messages/send',
    );
    expect(call).toBeDefined();
    const body = call?.[3] as { raw: string; threadId: string };
    const mime = Buffer.from(body.raw, 'base64url').toString();
    expect(body.threadId).toBe('thread');
    expect(mime).toContain('From: Team <team@example.com>');
    expect(mime).toContain('In-Reply-To: <original@example.com>');
    expect(mime).toContain(
      'References: <earlier@example.com> <original@example.com>',
    );
    expect(mime).toContain('Bcc: archive@example.com');
  });
  it('returns a recorded send on a repeated delivery key', async () => {
    const first = await sendMessage(payload);
    expect(await sendMessage(payload)).toEqual(first);
    expect(
      mocks.request.mock.calls.filter((call) => call[1] === '/messages/send'),
    ).toHaveLength(1);
  });
  it('does not send from an unverified Group address', async () => {
    mocks.request.mockResolvedValue({ sendAs: [] });
    await expect(sendMessage(payload)).rejects.toThrow('Send Mail As');
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it('refuses a foreign connection or an unrelated thread', async () => {
    await expect(
      sendMessage({ ...payload, connectedAccountId: 'foreign' }),
    ).rejects.toThrow('Resume');
    await expect(
      sendMessage({ ...payload, threadExternalId: 'different:thread' }),
    ).rejects.toThrow('not enabled');
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('does not repeat an uncertain delivery automatically', async () => {
    mocks.values.set('delivery:delivery', { phase: 'PENDING' });
    await expect(sendMessage(payload)).rejects.toThrow('uncertain');
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
