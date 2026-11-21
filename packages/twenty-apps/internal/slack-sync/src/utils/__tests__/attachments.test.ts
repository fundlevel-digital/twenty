import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  downloadSlackFile,
  MAX_ATTACHMENT_BYTES,
} from 'src/utils/download-file';
import { importSlackAttachments } from 'src/utils/import-attachments';
import { ingestSlackMessage } from 'src/utils/ingest-message';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  ingest: vi.fn(),
  store: new Map<string, unknown>(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  uploadMessageAttachment: mocks.upload,
  ingestMessages: mocks.ingest,
  kv: {
    get: async (key: string) => mocks.store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mocks.store.set(key, value);
    },
    delete: async (key: string) => mocks.store.delete(key),
  },
}));
vi.mock('src/utils/update-messages', () => ({ updateMessages: vi.fn() }));
vi.mock('src/utils/link-slack-replies', () => ({ linkSlackReplies: vi.fn() }));
const file = {
  id: 'F1',
  name: 'brief.txt',
  url_private: 'https://files.slack.com/files-pri/T1-F1/brief.txt',
};
const file2 = { ...file, id: 'F2', name: 'second.txt' };
const message = {
  externalId: 'T1:C1:100',
  threadExternalId: 'T1:C1:100',
  text: '',
  receivedAt: new Date(),
  participants: [{ role: 'FROM' as const, handle: 'T1:U1' }],
};
const fetchMock = vi.fn();
const download = (url = file.url_private) =>
  downloadSlackFile({
    token: 'synthetic-token',
    file: { ...file, url_private: url },
    signal: AbortSignal.timeout(1000),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.clear();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response('file contents'));
  mocks.upload.mockImplementation(
    async ({ filename }: { filename: string }) => ({
      fileId: `native-${filename}`,
      label: filename,
    }),
  );
  mocks.ingest.mockImplementation(
    async ({ messages }: { messages: { attachments?: unknown[] }[] }) => [
      {
        messageId: 'native-message',
        hasAttachments: Boolean(messages[0].attachments?.length),
      },
    ],
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('Slack file transport', () => {
  it('downloads authenticated bytes with redirects disabled', async () => {
    expect(new TextDecoder().decode(await download())).toBe('file contents');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Authorization: 'Bearer synthetic-token' },
        redirect: 'manual',
      }),
    );
  });
  it.each([
    'https://files.slack.com.evil.test/a',
    'http://files.slack.com/a',
    'https://user:password@files.slack.com/a',
    'https://127.0.0.1/a',
  ])('never sends credentials to %s', async (url) => {
    await expect(download(url)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects unsafe redirects before forwarding the token', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.test/file' },
      }),
    );
    await expect(download()).rejects.toThrow('Untrusted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('bounds streamed bytes without content-length', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array(MAX_ATTACHMENT_BYTES + 1)),
    );
    await expect(download()).rejects.toThrow('exceeds 20 MiB');
  });
  it('propagates rate limits for queue rescheduling', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'retry-after': '5' } }),
    );
    await expect(download()).rejects.toMatchObject({ delayMs: 5000 });
  });
});
describe('Native Slack attachments', () => {
  it('imports file-only messages and reuses complete batches across users', async () => {
    await ingestSlackMessage('channel', message, {
      token: 'token',
      files: [file],
    });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            text: '',
            attachments: [{ fileId: 'native-brief.txt', label: 'brief.txt' }],
          }),
        ],
      }),
    );
    mocks.ingest.mockResolvedValue([{ hasAttachments: true }]);
    await ingestSlackMessage('channel', message, {
      token: 'other-token',
      files: [file],
    });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('downloads all files before uploading and reports inaccessible files', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('first'))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    expect(
      await importSlackAttachments({
        token: 'token',
        externalId: message.externalId,
        files: [file, file2],
      }),
    ).toBeNull();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(
      mocks.store.get(`attachments:unavailable:${message.externalId}`),
    ).toMatchObject({ reason: expect.stringContaining('403') });
  });
  it('reuses successful uploads when a later upload fails', async () => {
    mocks.upload
      .mockResolvedValueOnce({ fileId: 'one', label: 'brief.txt' })
      .mockRejectedValueOnce(new Error('Upload failed'));
    await expect(
      importSlackAttachments({
        token: 'token',
        externalId: message.externalId,
        files: [file, file2],
      }),
    ).rejects.toThrow('Upload failed');
    mocks.upload.mockResolvedValue({ fileId: 'two', label: 'second.txt' });
    const attachments = await importSlackAttachments({
      token: 'token',
      externalId: message.externalId,
      files: [file, file2],
    });
    expect(attachments?.map((attachment) => attachment.fileId)).toEqual([
      'one',
      'two',
    ]);
    expect(mocks.upload).toHaveBeenCalledTimes(3);
  });
  it('surfaces unavailable files in the native message status field', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    await ingestSlackMessage('channel', message, {
      token: 'token',
      files: [file],
    });
    expect(mocks.ingest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            applicationFields: {
              message: {
                '66bb3f6c-b420-454b-8b96-1359711283f8':
                  expect.stringContaining('403'),
              },
            },
          }),
        ],
      }),
    );
  });
  it('reports existing partial batches instead of silently skipping missing files', async () => {
    mocks.ingest.mockResolvedValue([{ hasAttachments: true }]);
    await ingestSlackMessage('channel', message, {
      token: 'token',
      files: [file, file2],
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(
      mocks.store.get(`attachments:unavailable:${message.externalId}`),
    ).toMatchObject({ reason: expect.stringContaining('differs') });
  });
});
