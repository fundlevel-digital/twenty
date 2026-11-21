import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  graphql: vi.fn(),
  ingest: vi.fn(),
  attachments: vi.fn(),
  uploadMessageAttachment: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  getConnection: async () => ({ externalAccountId: 'account' }),
  listMessageChannels: async () => [{ id: 'channel', handle: 'me' }],
  ingestMessages: mocks.ingest,
  uploadMessageAttachment: mocks.uploadMessageAttachment,
  kv: {
    get: async (key: string) => mocks.store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mocks.store.set(key, structuredClone(value));
    },
  },
}));
vi.mock('src/lib/twenty', () => ({ graphql: mocks.graphql }));
vi.mock('src/logic-functions/utils/ensure-linkedin-account.util', () => ({
  ensureLinkedinAccount: async () => ({
    id: 'legacy-account',
    unipileAccountId: 'account',
  }),
}));
vi.mock(
  'src/logic-functions/utils/import-linkedin-message-attachments.util',
  () => ({ importLinkedinMessageAttachments: mocks.attachments }),
);
vi.mock('src/unipile/utils/with-unipile-account-request.util', () => ({
  withLinkedinLease: (_key: string, operation: () => Promise<unknown>) =>
    operation(),
}));
const { linkedinMigrateMessagesHandler } = await import(
  'src/logic-functions/linkedin-migrate-messages'
);
const run = () =>
  linkedinMigrateMessagesHandler({ connectedAccountId: 'connection' });
const message = {
  id: 'legacy',
  unipileMessageId: 'external',
  unipileChatId: 'chat',
  sentAt: '2026-11-21T00:00:00Z',
  text: 'hello',
  direction: 'OUTBOUND',
  isDeleted: false,
  connection: null,
  hasAttachments: false,
  attachmentDetails: [],
};
describe('legacy migration checkpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.clear();
    mocks.uploadMessageAttachment.mockResolvedValue({
      fileId: 'metadata-file',
      label: 'Metadata.json',
    });
    mocks.attachments.mockResolvedValue(0);
    mocks.graphql.mockResolvedValue({
      data: {
        linkedinMessages: {
          edges: [{ cursor: 'last', node: message }],
          pageInfo: { hasNextPage: false, endCursor: 'last' },
        },
      },
    });
    mocks.ingest.mockResolvedValue([
      {
        externalId: 'external',
        messageId: 'core-message',
        messageThreadId: 'core-thread',
        hasAttachments: false,
      },
    ]);
  });
  it('marks a page complete only after every message is acknowledged', async () => {
    await expect(run()).resolves.toMatchObject({
      status: 'COMPLETED',
      migratedCount: 1,
    });
    expect(mocks.ingest.mock.calls[0][0]).toMatchObject({
      messageChannelId: 'channel',
      messages: [{ externalId: 'external', threadExternalId: 'chat' }],
    });
  });
  it('leaves progress untouched on a partial acknowledgement', async () => {
    mocks.ingest.mockResolvedValue([]);
    await expect(run()).rejects.toThrow('did not acknowledge');
    expect(mocks.store.size).toBe(0);
  });
  it('preserves attachment metadata without contacting the provider in saved-data mode', async () => {
    mocks.graphql.mockResolvedValue({
      data: {
        linkedinMessages: {
          edges: [
            {
              node: {
                ...message,
                hasAttachments: true,
                attachmentDetails: [
                  { id: 'original', kind: 'file', mimetype: 'application/pdf' },
                ],
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    });
    await expect(
      linkedinMigrateMessagesHandler({
        connectedAccountId: 'connection',
        savedDataOnly: true,
      }),
    ).resolves.toMatchObject({
      status: 'COMPLETED',
      attachmentMode: 'SAVED_DATA',
      missingOriginalAttachmentMessageCount: 1,
    });
    expect(mocks.attachments).not.toHaveBeenCalled();
    const upload = mocks.uploadMessageAttachment.mock.calls[0][0];
    expect(JSON.parse(upload.content.toString())).toMatchObject({
      originalFilesIncluded: false,
      messageId: 'external',
      attachmentDetails: [{ id: 'original' }],
    });
    expect(mocks.ingest.mock.calls[0][0].messages[0].attachments).toEqual([
      { fileId: 'metadata-file', label: 'Metadata.json' },
    ]);
  });
  it('reuses an uploaded metadata file after a core-ingestion failure', async () => {
    mocks.graphql.mockResolvedValue({
      data: {
        linkedinMessages: {
          edges: [{ node: { ...message, hasAttachments: true } }],
          pageInfo: { hasNextPage: false },
        },
      },
    });
    mocks.ingest.mockRejectedValueOnce(new Error('temporarily unavailable'));
    const payload = { connectedAccountId: 'connection', savedDataOnly: true };
    await expect(linkedinMigrateMessagesHandler(payload)).rejects.toThrow(
      'temporarily unavailable',
    );
    await expect(
      linkedinMigrateMessagesHandler(payload),
    ).resolves.toMatchObject({ status: 'COMPLETED' });
    expect(mocks.uploadMessageAttachment).toHaveBeenCalledTimes(1);
  });
  it('does not allow switching attachment mode on resume', async () => {
    await run();
    await expect(
      linkedinMigrateMessagesHandler({
        connectedAccountId: 'connection',
        savedDataOnly: true,
      }),
    ).rejects.toThrow('same attachment mode');
  });

  it('does not migrate an already completed run again', async () => {
    await run();
    mocks.graphql.mockClear();
    mocks.ingest.mockClear();
    await run();
    expect(mocks.graphql).not.toHaveBeenCalled();
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('stops before advancing when a supported attachment is missing', async () => {
    mocks.graphql.mockResolvedValue({
      data: {
        linkedinMessages: {
          edges: [
            {
              node: {
                ...message,
                hasAttachments: true,
                attachmentDetails: [
                  { id: 'file', kind: 'file', mimetype: 'application/pdf' },
                ],
              },
            },
          ],
          pageInfo: { hasNextPage: false },
        },
      },
    });
    await expect(run()).rejects.toThrow(
      'Not every supported legacy attachment',
    );
    expect(mocks.store.size).toBe(0);
  });
});

it('does not let a member migrate another member’s account', async () => {
  mocks.store.clear();
  mocks.graphql.mockClear();
  await expect(
    linkedinMigrateMessagesHandler(
      { connectedAccountId: 'connection' },
      { userWorkspaceId: 'other-member' },
    ),
  ).rejects.toThrow('another member');
  expect(mocks.graphql).not.toHaveBeenCalled();
});
