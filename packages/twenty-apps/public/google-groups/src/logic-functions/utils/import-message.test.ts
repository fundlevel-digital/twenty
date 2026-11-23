import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type IngestMessage } from 'twenty-sdk/logic-function';
import { type GoogleMessage } from 'src/logic-functions/utils/google';
import { type GroupSettings } from 'src/types/settings';

const mocks = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  upload: vi.fn(),
  ingest: vi.fn(),
}));

vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: async (key: string) => mocks.values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mocks.values.set(key, value);
    },
  },
  uploadMessageAttachment: mocks.upload,
  ingestMessages: mocks.ingest,
}));
vi.mock('src/logic-functions/utils/preferences', () => ({
  assertActiveRevision: async () => ({
    settings: { contactCreation: 'NONE', groups: [] },
  }),
  ensureChannel: async (_connectionId: string, group: GroupSettings) => ({
    id: group.id,
  }),
}));
vi.mock('src/logic-functions/utils/contacts', () => ({
  resolvePerson: async () => undefined,
}));
vi.mock('src/logic-functions/utils/google', () => ({
  googleRequest: vi.fn(),
}));
vi.mock('src/logic-functions/utils/update-inbox-summary', () => ({
  updateInboxSummary: vi.fn(),
}));

import { importMessage } from 'src/logic-functions/utils/import-message';

const team: GroupSettings = {
  id: 'team',
  email: 'team@example.com',
  name: 'Team',
  visibility: 'SHARE_EVERYTHING',
  enabled: true,
};
const operations: GroupSettings = {
  ...team,
  id: 'operations',
  email: 'ops@example.com',
};
const message: GoogleMessage = {
  id: 'message',
  threadId: 'thread',
  internalDate: '1700000000000',
  payload: {
    headers: [
      { name: 'From', value: 'sender@example.com' },
      { name: 'To', value: 'team@example.com, ops@example.com' },
    ],
    parts: [
      {
        filename: 'document.txt',
        body: { data: Buffer.from('Document').toString('base64url') },
      },
    ],
  },
};

describe('Group message attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.clear();
    mocks.upload.mockImplementation(async () => ({
      fileId: `file-${mocks.upload.mock.calls.length}`,
      label: 'document.txt',
    }));
    const attachmentOwners = new Map<string, string>();
    mocks.ingest.mockImplementation(
      async ({ messages }: { messages: IngestMessage[] }) => {
        for (const savedMessage of messages) {
          for (const attachment of savedMessage.attachments ?? []) {
            const owner = attachmentOwners.get(attachment.fileId);
            if (owner && owner !== savedMessage.externalId)
              throw new Error('File is already attached to another message');
            attachmentOwners.set(attachment.fileId, savedMessage.externalId);
          }
        }
        return [{ messageId: 'saved-message' }];
      },
    );
  });

  it('imports the same attachment into both Groups and safely replays them', async () => {
    for (const group of [team, operations, team, operations]) {
      await expect(
        importMessage('account', group, message, 'revision', []),
      ).resolves.toEqual({ messageId: 'saved-message' });
    }

    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.ingest).toHaveBeenCalledTimes(4);
  });

  it('accepts extensionless attachments while preserving their displayed filename', async () => {
    await importMessage(
      'account',
      team,
      {
        ...message,
        payload: {
          ...message.payload,
          parts: [
            {
              filename: 'README',
              body: { data: Buffer.from('Document').toString('base64url') },
            },
          ],
        },
      },
      'revision',
      [],
    );

    expect(mocks.upload).toHaveBeenCalledWith({
      filename: 'README.bin',
      content: Buffer.from('Document'),
    });
    expect(mocks.ingest).toHaveBeenCalledWith({
      messageChannelId: team.id,
      messages: [
        expect.objectContaining({
          attachments: [{ fileId: 'file-1', label: 'README' }],
        }),
      ],
    });
  });
});
