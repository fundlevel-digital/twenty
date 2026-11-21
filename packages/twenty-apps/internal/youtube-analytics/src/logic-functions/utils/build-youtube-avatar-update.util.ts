import { isNonEmptyString } from '@sniptt/guards';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/constants/universal-identifiers';
import { type AnalyticsEntry } from 'src/logic-functions/types/analytics-entry.type';

const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_REQUEST_TIMEOUT_MILLISECONDS = 10_000;

export const buildYoutubeAvatarUpdate = async ({
  entry,
  avatarUrl,
}: {
  entry: Pick<AnalyticsEntry, 'avatarUrl' | 'hasAvatar'>;
  avatarUrl: string | null;
}): Promise<Record<string, unknown>> => {
  if (
    !isNonEmptyString(avatarUrl) ||
    (entry.hasAvatar && entry.avatarUrl === avatarUrl)
  ) {
    return {};
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
  const filename = `youtube-avatar.${mimeType.slice('image/'.length).replace('jpeg', 'jpg')}`;
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
        fieldMetadataUniversalIdentifier:
          YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.avatarFile,
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
