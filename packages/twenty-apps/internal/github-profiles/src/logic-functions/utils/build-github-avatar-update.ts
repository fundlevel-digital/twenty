import { isNonEmptyString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { PROFILE_FIELDS } from 'src/constants/identifiers';

const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_REQUEST_TIMEOUT_MILLISECONDS = 10_000;

export const buildGithubAvatarUpdate = async ({
  entry,
  avatarUrl,
}: {
  entry: { avatarUrl: string | null; hasAvatar: boolean };
  avatarUrl: string | null;
}): Promise<Record<string, unknown>> => {
  if (
    !isNonEmptyString(avatarUrl) ||
    (entry.hasAvatar && entry.avatarUrl === avatarUrl)
  ) {
    return {};
  }

  if (
    new URL(avatarUrl).hostname !== 'avatars.githubusercontent.com' ||
    new URL(avatarUrl).protocol !== 'https:'
  ) {
    throw new Error('Unexpected GitHub avatar host.');
  }

  const response = await fetch(avatarUrl, {
    signal: AbortSignal.timeout(AVATAR_REQUEST_TIMEOUT_MILLISECONDS),
  });
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? '';

  if (
    !response.ok ||
    response.body === null ||
    !mimeType.startsWith('image/')
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
  const filename = `github-avatar.${mimeType.slice('image/'.length).replace('jpeg', 'jpg')}`;
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
        fieldMetadataUniversalIdentifier: PROFILE_FIELDS.avatarFile,
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
    avatarFile: [{ fileId: completeFileUpload.id, label: filename }],
  };
};
