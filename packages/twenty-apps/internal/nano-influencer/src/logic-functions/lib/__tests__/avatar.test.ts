import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildNanoAvatarUpdate } from '../avatar';
import { IDENTIFIERS } from '../../../constants/identifiers';

const { mutation } = vi.hoisted(() => ({ mutation: vi.fn() }));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    mutation = mutation;
  },
}));
const AVATAR_URL = 'https://yt3.ggpht.com/photo';
const ENTRY = { avatarUrl: null, hasAvatar: false };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mutation.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
it('uploads and completes a native file before returning the avatar fields', async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 200 }));
  mutation
    .mockResolvedValueOnce({
      createFileUpload: {
        fileId: 'pending',
        uploadUrl: 'https://storage.example/upload',
        contentType: 'image/jpeg',
      },
    })
    .mockResolvedValueOnce({ completeFileUpload: { id: 'file-id' } });
  expect(
    await buildNanoAvatarUpdate({ entry: ENTRY, avatarUrl: AVATAR_URL }),
  ).toEqual({
    avatarUrl: AVATAR_URL,
    avatarFile: [{ fileId: 'file-id', label: 'nano-avatar.jpg' }],
  });
  expect(mutation.mock.calls[0][0].createFileUpload.__args).toEqual({
    filename: 'nano-avatar.jpg',
    size: 3,
    fileFolder: 'FilesField',
    fieldMetadataUniversalIdentifier: IDENTIFIERS.creatorAvatar,
  });
  expect(mutation.mock.calls[1][0].completeFileUpload.__args.fileId).toBe(
    'pending',
  );
  expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
});
it.each([null, ''])(
  'keeps existing photos when no upstream thumbnail exists (%s)',
  async (avatarUrl) => {
    expect(await buildNanoAvatarUpdate({ entry: ENTRY, avatarUrl })).toEqual(
      {},
    );
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it('skips an unchanged photo that is already stored', async () => {
  expect(
    await buildNanoAvatarUpdate({
      entry: { avatarUrl: AVATAR_URL, hasAvatar: true },
      avatarUrl: AVATAR_URL,
    }),
  ).toEqual({});
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  [500, 'image/jpeg', new Uint8Array([1])],
  [200, 'text/html', new Uint8Array([1])],
  [200, 'image/jpeg', new Uint8Array(2 * 1024 * 1024 + 1)],
  [200, 'image/jpeg', new Uint8Array(0)],
])(
  'rejects invalid downloads before requesting an upload (%s, %s)',
  async (status, contentType, body) => {
    fetchMock.mockResolvedValueOnce(
      new Response(body, { status, headers: { 'Content-Type': contentType } }),
    );
    await expect(
      buildNanoAvatarUpdate({ entry: ENTRY, avatarUrl: AVATAR_URL }),
    ).rejects.toThrow();
    expect(mutation).not.toHaveBeenCalled();
  },
);
it('does not complete or return a failed upload', async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(new Uint8Array([1]), {
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 503 }));
  mutation.mockResolvedValueOnce({
    createFileUpload: {
      fileId: 'pending',
      uploadUrl: 'https://storage.example/upload',
      contentType: 'image/jpeg',
    },
  });
  await expect(
    buildNanoAvatarUpdate({ entry: ENTRY, avatarUrl: AVATAR_URL }),
  ).rejects.toThrow('Avatar upload failed');
  expect(mutation).toHaveBeenCalledOnce();
});

it('imports Nano CDN JPEGs served with a generic binary content type', async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), {
        headers: { 'Content-Type': 'binary/octet-stream' },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 200 }));
  mutation
    .mockResolvedValueOnce({
      createFileUpload: {
        fileId: 'pending',
        uploadUrl: 'https://storage.example/upload',
        contentType: 'image/jpeg',
      },
    })
    .mockResolvedValueOnce({ completeFileUpload: { id: 'file-id' } });
  await expect(
    buildNanoAvatarUpdate({
      entry: ENTRY,
      avatarUrl: 'https://m.vistud.io/avatar',
    }),
  ).resolves.toMatchObject({
    avatarFile: [{ fileId: 'file-id', label: 'nano-avatar.jpg' }],
  });
  expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
    Referer: 'https://www.nanoinfluencer.ai/',
  });
});
it('rejects non-image bytes served with a generic binary content type', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response('not an image', {
      headers: { 'Content-Type': 'binary/octet-stream' },
    }),
  );
  await expect(
    buildNanoAvatarUpdate({ entry: ENTRY, avatarUrl: AVATAR_URL }),
  ).rejects.toThrow('not a supported image');
  expect(mutation).not.toHaveBeenCalled();
});
