import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  wait,
  values,
  ingestMessages,
  createMessageChannel,
  updateMessageChannel,
  listMessageChannels,
  listConnections,
  get,
  post,
  patch,
  syncPerson,
  syncCampaign,
  syncWorkspace,
} = vi.hoisted(() => ({
  wait: vi.fn(async () => undefined),
  values: new Map<string, unknown>(),
  ingestMessages: vi.fn(),
  createMessageChannel: vi.fn(),
  updateMessageChannel: vi.fn(),
  listMessageChannels: vi.fn(),
  listConnections: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  syncPerson: vi.fn(),
  syncCampaign: vi.fn(),
  syncWorkspace: vi.fn(),
}));
vi.mock('node:timers/promises', () => ({ setTimeout: wait }));
vi.mock('twenty-sdk/logic-function', () => ({
  ingestMessages,
  createMessageChannel,
  updateMessageChannel,
  listMessageChannels,
  listConnections,
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('twenty-client-sdk/rest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-client-sdk/rest')>()),
  RestApiClient: class {
    get = get;
    post = post;
    patch = patch;
  },
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson,
  syncCampaign,
  recordId: (...parts: string[]) => parts.join(':'),
}));
vi.mock('src/logic-functions/utils/sync-relations', () => ({
  syncSender: vi.fn(async () => 'sender-record'),
  findSourceLeadIds: vi.fn(async () => ['lead-record']),
  syncEmailRelations: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-workspace', () => ({ syncWorkspace }));
vi.mock('src/logic-functions/utils/sync-source-thread', () => ({
  syncSourceThread: async () => 'source-thread-record',
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  getAccountConnection: async () => undefined,
  getApiKeyFingerprint: () => 'fingerprint',
}));

import { RestApiClientError } from 'twenty-client-sdk/rest';

import {
  getCanonicalThreadId,
  mergeThreadState,
  syncNativeEmail,
  type NativeEmail,
} from 'src/logic-functions/utils/native-email';

const EMAIL: NativeEmail = {
  externalId: '<message@example.com>',
  workspaceId: 'workspace-1',
  workspaceName: 'Sales',
  sender: 'sender@example.com',
  senderEvidence: 'PROVIDER_ACCOUNT',
  leadEmail: 'lead@example.com',
  campaignId: 'campaign-1',
  threadId: 'provider-thread-1',
  subject: 'Hello',
  text: 'How can we help?',
  receivedAt: '2026-11-20T10:00:00Z',
  direction: 'OUT',
};
const CURRENT_THREAD = {
  updatedAt: '2026-11-20T11:00:00Z',
  plusvibeHasReplies: false,
  plusvibeReplyLabels: [],
  plusvibeLatestActivityAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  listConnections.mockReset().mockResolvedValue([
    {
      id: 'connection-1',
      providerName: 'plusvibe-mail',
      externalAccountId: 'fingerprint',
      authFailedAt: null,
    },
  ]);
  listMessageChannels.mockReset().mockResolvedValue([]);
  createMessageChannel
    .mockReset()
    .mockImplementation(async (input) => ({ ...input, id: 'channel-1' }));
  updateMessageChannel.mockReset().mockImplementation(async (input) => ({
    ...input,
    handle: 'plusvibe:unibox:sender@example.com',
  }));
  ingestMessages.mockReset().mockResolvedValue([
    {
      externalId: EMAIL.externalId,
      messageId: 'native-message-1',
      messageThreadId: 'native-thread-1',
    },
  ]);
  syncPerson.mockResolvedValue('person-1');
  syncCampaign.mockResolvedValue('campaign-record-1');
  syncWorkspace.mockResolvedValue('workspace-record-1');
  get
    .mockReset()
    .mockResolvedValue({ data: { messageThread: CURRENT_THREAD } });
  post.mockReset().mockResolvedValue({
    data: { messageChannelMessageAssociations: { edges: [] } },
  });
  patch.mockReset().mockResolvedValue({
    data: { updateMessageThreads: [{ id: 'native-thread-1' }] },
  });
});

describe('Native PlusVibe emails', () => {
  it('reuses an existing message channel when history is replayed through another import path', async () => {
    const existing = {
      id: 'original-channel',
      connectedAccountId: 'connection-1',
      handle: 'plusvibe:unibox:sender@example.com',
      visibility: 'METADATA',
    };
    post.mockResolvedValue({
      data: {
        messageChannelMessageAssociations: {
          edges: [
            {
              node: {
                messageChannelId: existing.id,
                messageId: 'native-message-1',
              },
            },
          ],
        },
      },
    });
    listMessageChannels.mockResolvedValue([existing]);
    get.mockImplementation(async (path: string) =>
      path.startsWith('/rest/messages/')
        ? {
            data: {
              message: {
                id: 'native-message-1',
                messageThreadId: 'original-thread',
                text: 'Original untouched body',
              },
            },
          }
        : { data: { messageThread: CURRENT_THREAD } },
    );
    const result = await syncNativeEmail({
      ...EMAIL,
      text: 'Different replay body',
    });
    expect(result).toMatchObject({
      messageId: 'native-message-1',
      messageThreadId: 'original-thread',
    });
    expect(ingestMessages).not.toHaveBeenCalled();
    for (const [path, fields] of patch.mock.calls) {
      if (path === '/rest/messages/native-message-1') {
        expect(fields).not.toHaveProperty('text');
        expect(fields).not.toHaveProperty('subject');
        expect(fields).not.toHaveProperty('receivedAt');
        expect(fields).not.toHaveProperty('messageThreadId');
      }
    }
    expect(updateMessageChannel).not.toHaveBeenCalled();
  });
  it('preserves a reply with no resolvable inbox without inventing a recipient or sender record', async () => {
    await syncNativeEmail({
      ...EMAIL,
      direction: 'IN',
      sender: EMAIL.leadEmail,
    });
    expect(createMessageChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'plusvibe:unibox:unresolved:workspace-1',
      }),
    );
    expect(ingestMessages.mock.calls[0][0].messages[0].participants).toEqual([
      expect.objectContaining({ role: 'FROM', handle: EMAIL.leadEmail }),
    ]);
    expect(patch).toHaveBeenCalledWith(
      '/rest/messages/native-message-1',
      expect.objectContaining({
        plusvibeSenderRecordId: null,
        plusvibeInboxResolution: 'Unresolved',
      }),
    );
  });
  it('preserves outbound history with an unresolved inbox instead of treating the lead as its sender', async () => {
    await expect(
      syncNativeEmail({
        ...EMAIL,
        sender: EMAIL.leadEmail.toUpperCase(),
        direction: 'OUT',
      }),
    ).resolves.toBeDefined();
    expect(
      ingestMessages.mock.calls[0][0].messages[0].participants[0],
    ).toMatchObject({
      role: 'FROM',
      handle: 'plusvibe:unibox:unresolved:workspace-1',
    });
    expect(patch).toHaveBeenCalledWith(
      '/rest/messages/native-message-1',
      expect.objectContaining({
        plusvibeSenderRecordId: null,
        plusvibeInboxResolution: 'Unresolved',
      }),
    );
  });
  it('groups campaign history with a previously identified provider thread', async () => {
    await syncNativeEmail(EMAIL);
    await syncNativeEmail({
      ...EMAIL,
      externalId: 'older-send',
      threadId: undefined,
    });
    expect(patch).toHaveBeenCalledWith(
      '/rest/messages/native-message-1',
      expect.objectContaining({
        plusvibeThreadRecordId: 'source-thread-record',
      }),
    );
  });

  it('keeps oversized emails within native ingestion limits', async () => {
    await syncNativeEmail({
      ...EMAIL,
      text: 'x'.repeat(262_145),
      subject: 's'.repeat(999),
    });
    expect(ingestMessages.mock.calls[0][0].messages[0].text).toHaveLength(
      262_144,
    );
    expect(ingestMessages.mock.calls[0][0].messages[0].subject).toHaveLength(
      998,
    );
  });

  it('retains the source lead identity when a reply uses an alternate address', async () => {
    await syncNativeEmail({
      ...EMAIL,
      leadEmail: 'alternate@example.com',
      leadId: 'source-lead-1',
      direction: 'IN',
    });
    expect(syncPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alternate@example.com',
        lead_id: 'source-lead-1',
      }),
      EMAIL.workspaceId,
      { direction: 'IN', senderEmail: EMAIL.sender },
    );
  });
  it('ingests real Messages with the lead participant linked to a Person', async () => {
    await syncNativeEmail(EMAIL);
    expect(ingestMessages).toHaveBeenCalledWith({
      messageChannelId: 'channel-1',
      messages: [
        expect.objectContaining({
          externalId: `workspace-1:${EMAIL.externalId}`,
          threadExternalId: 'workspace-1:provider-thread-1',
          text: EMAIL.text,
          participants: [
            expect.objectContaining({
              role: 'FROM',
              handle: 'plusvibe:outreach:sender@example.com',
            }),
            expect.objectContaining({ role: 'TO', personId: 'person-1' }),
          ],
        }),
      ],
    });
    expect(patch).toHaveBeenCalledWith(
      '/rest/messages/native-message-1',
      expect.objectContaining({
        source: 'PLUSVIBE',
        plusvibeWorkspaceRecordId: 'workspace-record-1',
        plusvibeCampaignRecordId: 'campaign-record-1',
        plusvibeThreadRecordId: 'source-thread-record',
      }),
    );
  });

  it('ingests replies as incoming and sets the native thread reply filter', async () => {
    await syncNativeEmail({ ...EMAIL, direction: 'IN', label: 'INTERESTED' });
    expect(ingestMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            participants: [
              expect.objectContaining({ role: 'TO' }),
              expect.objectContaining({ role: 'FROM', personId: 'person-1' }),
            ],
          }),
        ],
      }),
    );
    expect(patch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/messageThreads?filter='),
      expect.objectContaining({
        plusvibeHasReplies: true,
        plusvibeReplyLabels: ['INTERESTED'],
        plusvibeReplyLabel: 'INTERESTED',
      }),
    );
  });

  it('keeps message identities isolated when a sender is shared by two source workspaces', async () => {
    await syncNativeEmail(EMAIL);
    await syncNativeEmail({ ...EMAIL, workspaceId: 'workspace-2' });
    expect(ingestMessages.mock.calls[0][0].messages[0].externalId).not.toBe(
      ingestMessages.mock.calls[1][0].messages[0].externalId,
    );
    expect(
      ingestMessages.mock.calls[0][0].messages[0].threadExternalId,
    ).not.toBe(ingestMessages.mock.calls[1][0].messages[0].threadExternalId);
  });

  it('reuses existing channels and never creates messages without an approved connection', async () => {
    listMessageChannels.mockResolvedValueOnce([
      {
        id: 'existing-channel',
        handle: 'plusvibe:outreach:sender@example.com',
        visibility: 'SHARE_EVERYTHING',
      },
    ]);
    await syncNativeEmail(EMAIL);
    expect(createMessageChannel).not.toHaveBeenCalled();
    listConnections.mockResolvedValueOnce([]);
    await expect(syncNativeEmail(EMAIL)).rejects.toThrow('Connect PlusVibe');
    expect(ingestMessages).toHaveBeenCalledOnce();
  });

  it('keeps outreach fully shared while Unibox uses the configured native privacy level', async () => {
    values.set('plusvibe:registration:workspace-1', {
      accountConnectionId: 'account-1',
    });
    values.set('plusvibe:preferences:account-1', {
      autoCreatePeople: false,
      uniboxVisibility: 'SUBJECT',
    });
    await syncNativeEmail(EMAIL);
    expect(createMessageChannel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        handle: 'plusvibe:outreach:sender@example.com',
        visibility: 'SHARE_EVERYTHING',
      }),
    );
    await syncNativeEmail({ ...EMAIL, direction: 'IN' });
    expect(createMessageChannel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        handle: 'plusvibe:unibox:sender@example.com',
        visibility: 'SUBJECT',
      }),
    );
  });

  it('ingests an unmatched lead without implicitly creating or linking a Person', async () => {
    syncPerson.mockResolvedValueOnce(undefined);
    await syncNativeEmail(EMAIL);
    expect(
      ingestMessages.mock.calls[0][0].messages[0].participants[1],
    ).not.toHaveProperty('personId');
  });

  it('adopts a later PlusVibe thread ID without splitting the initial conversation', async () => {
    const first = await getCanonicalThreadId({ ...EMAIL, threadId: undefined });
    expect(await getCanonicalThreadId(EMAIL)).toBe(first);
    expect(
      await getCanonicalThreadId({
        ...EMAIL,
        threadId: 'another-provider-thread',
      }),
    ).toBe('another-provider-thread');
  });

  it('preserves interested/not interested history and reply state after later sends', () => {
    const state = {
      ...CURRENT_THREAD,
      plusvibeHasReplies: true,
      plusvibeReplyLabels: ['INTERESTED'],
      plusvibeReplyLabel: 'INTERESTED',
      plusvibeLatestActivityAt: '2026-11-20T10:00:00Z',
    };
    expect(
      mergeThreadState(state, {
        direction: 'OUT',
        label: 'NOT_INTERESTED',
        receivedAt: '2026-11-20T11:00:00Z',
      }),
    ).toMatchObject({
      plusvibeHasReplies: true,
      plusvibeReplyLabels: ['INTERESTED', 'NOT_INTERESTED'],
      plusvibeReplyLabel: 'NOT_INTERESTED',
    });
    expect(
      mergeThreadState(state, {
        direction: 'IN',
        label: 'NOT_INTERESTED',
        receivedAt: '2026-11-19T11:00:00Z',
      }).plusvibeReplyLabel,
    ).toBe('INTERESTED');
  });

  it('retries metadata updates after a concurrent thread change', async () => {
    patch.mockImplementation(async (path: string) =>
      path.startsWith('/rest/messageThreads?')
        ? {
            data: {
              updateMessageThreads:
                patch.mock.calls.filter(([url]) =>
                  String(url).startsWith('/rest/messageThreads?'),
                ).length === 1
                  ? []
                  : [{ id: 'native-thread-1' }],
            },
          }
        : {},
    );
    await syncNativeEmail(EMAIL);
    expect(
      patch.mock.calls.filter(([url]) =>
        String(url).startsWith('/rest/messageThreads?'),
      ),
    ).toHaveLength(2);
  });

  it('propagates ingestion failures instead of producing activity copies', async () => {
    ingestMessages.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(syncNativeEmail(EMAIL)).rejects.toThrow(
      'Database unavailable',
    );
    expect(patch).not.toHaveBeenCalled();
  });
});

it('uses owned From evidence to correct a mislabeled incoming provider record', async () => {
  values.set('plusvibe:owned-inboxes:workspace-1', ['sender@example.com']);
  await syncNativeEmail({
    ...EMAIL,
    sender: 'lead@example.com',
    leadEmail: 'sender@example.com',
    direction: 'IN',
    senderEvidence: 'RECIPIENT_HEADER',
  });
  expect(ingestMessages.mock.calls[0][0].messages[0].participants).toEqual([
    expect.objectContaining({
      role: 'FROM',
      displayName: 'sender@example.com',
    }),
    expect.objectContaining({ role: 'TO', handle: 'lead@example.com' }),
  ]);
});

it('retries a native API rate limit without losing the source message', async () => {
  syncPerson.mockRejectedValueOnce(
    new RestApiClientError('Rate limited', { status: 429 }),
  );
  await syncNativeEmail(EMAIL);
  expect(wait).toHaveBeenCalledWith(5000);
  expect(ingestMessages).toHaveBeenCalledOnce();
});

it('stops retrying a persistent native API rate limit', async () => {
  const error = new RestApiClientError('Rate limited', { status: 429 });
  syncPerson.mockRejectedValue(error);
  await expect(syncNativeEmail(EMAIL)).rejects.toBe(error);
  expect(wait).toHaveBeenCalledTimes(5);
  expect(ingestMessages).not.toHaveBeenCalled();
});
