import { isNonEmptyString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { IDENTIFIERS } from '../../constants/identifiers';

const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_REQUEST_TIMEOUT_MILLISECONDS = 10_000;

export const buildNanoAvatarUpdate = async ({
  entry,
  avatarUrl,
}: {
  entry: { avatarUrl?: unknown; hasAvatar: boolean };
  avatarUrl: string | null;
}): Promise<Record<string, unknown>> => {
  if (
    !isNonEmptyString(avatarUrl) ||
    (entry.hasAvatar && entry.avatarUrl === avatarUrl)
  ) {
    return {};
  }

  const url = new URL(avatarUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    ![
      'vistud.io',
      'ggpht.com',
      'googleusercontent.com',
      'twimg.com',
      'cdninstagram.com',
      'fbcdn.net',
      'tiktokcdn.com',
      'tiktokcdn-us.com',
      'byteoversea.com',
      'nanoinfluencer.ai',
    ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  )
    throw new Error('Nano avatar URL is not a supported image host.');
  const response = await fetch(avatarUrl, {
    redirect: 'error',
    headers: {
      Referer: 'https://www.nanoinfluencer.ai/',
      'User-Agent': 'Mozilla/5.0',
      Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(AVATAR_REQUEST_TIMEOUT_MILLISECONDS),
  });
  let mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';
  const isBinary =
    mimeType === 'binary/octet-stream' ||
    mimeType === 'application/octet-stream';

  if (
    !response.ok ||
    response.body === null ||
    (!mimeType.startsWith('image/') && !isBinary)
  ) {
    await response.body?.cancel();
    throw new Error(
      `Avatar download failed: status ${response.status}, content type ${mimeType}`,
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > AVATAR_MAX_SIZE_BYTES) {
      await reader.cancel();
      throw new Error('Avatar exceeds the 2 MB limit');
    }
    chunks.push(value);
  }

  if (size === 0) {
    throw new Error('Avatar image is empty');
  }

  const content = Buffer.concat(chunks);
  if (isBinary) {
    if (content.subarray(0, 3).toString('hex') === 'ffd8ff')
      mimeType = 'image/jpeg';
    else if (content.subarray(0, 8).toString('hex') === '89504e470d0a1a0a')
      mimeType = 'image/png';
    else if (
      content.subarray(0, 4).toString() === 'RIFF' &&
      content.subarray(8, 12).toString() === 'WEBP'
    )
      mimeType = 'image/webp';
    else if (['GIF87a', 'GIF89a'].includes(content.subarray(0, 6).toString()))
      mimeType = 'image/gif';
    else if (
      content.subarray(4, 8).toString() === 'ftyp' &&
      ['avif', 'avis'].includes(content.subarray(8, 12).toString())
    )
      mimeType = 'image/avif';
    else throw new Error('Avatar download is not a supported image.');
  }
  const filename = `nano-avatar.${mimeType.slice('image/'.length).replace('jpeg', 'jpg')}`;
  const metadataClient = new MetadataApiClient({
    runAs: 'application',
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        signal: AbortSignal.timeout(AVATAR_REQUEST_TIMEOUT_MILLISECONDS),
      }),
  });
  const { createFileUpload } = await metadataClient.mutation({
    createFileUpload: {
      __args: {
        filename,
        size,
        fileFolder: 'FilesField',
        fieldMetadataUniversalIdentifier: IDENTIFIERS.creatorAvatar,
      },
      fileId: true,
      uploadUrl: true,
      contentType: true,
    },
  });
  const uploaded = await fetch(createFileUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': createFileUpload.contentType },
    body: new Uint8Array(content),
    signal: AbortSignal.timeout(AVATAR_REQUEST_TIMEOUT_MILLISECONDS),
  });
  if (!uploaded.ok) {
    throw new Error(`Avatar upload failed: status ${uploaded.status}`);
  }

  const { completeFileUpload } = await metadataClient.mutation({
    completeFileUpload: {
      __args: { fileId: createFileUpload.fileId },
      id: true,
    },
  });
  return {
    avatarUrl,
    avatarFile: [{ fileId: completeFileUpload.id, label: filename }],
  };
};
