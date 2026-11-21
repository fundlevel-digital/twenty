import { type SlackFile, SlackRateLimitError } from 'src/utils/slack';

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_MESSAGE_ATTACHMENT_BYTES = 40 * 1024 * 1024;
export class SlackFileUnavailableError extends Error {}

const assertSlackFileUrl = (value: string): URL => {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'files.slack.com' ||
    (url.port !== '' && url.port !== '443') ||
    url.username ||
    url.password
  )
    throw new SlackFileUnavailableError('Untrusted Slack file URL');
  return url;
};

export const downloadSlackFile = async ({
  token,
  file,
  signal,
}: {
  token: string;
  file: SlackFile;
  signal: AbortSignal;
}): Promise<Uint8Array> => {
  const source = file.url_private_download ?? file.url_private;
  if (
    file.is_external ||
    file.mode === 'external' ||
    file.filetype === 'remote' ||
    !source ||
    (file.size ?? 0) > MAX_ATTACHMENT_BYTES
  )
    throw new SlackFileUnavailableError(
      'Slack file is external, unavailable or exceeds 20 MiB',
    );
  let url = assertSlackFileUrl(source);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual',
      signal,
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location)
        throw new SlackFileUnavailableError(
          'Slack file redirect has no location',
        );
      url = assertSlackFileUrl(new URL(location, url).href);
      continue;
    }
    if (response.status === 429) {
      await response.body?.cancel();
      throw new SlackRateLimitError(
        Math.max(1, Number(response.headers.get('retry-after')) || 60) * 1000,
      );
    }
    if ([401, 403, 404].includes(response.status)) {
      await response.body?.cancel();
      throw new SlackFileUnavailableError(
        `Slack file inaccessible (${response.status})`,
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Slack file download failed (${response.status})`);
    }
    if (response.headers.get('content-type')?.includes('text/html')) {
      await response.body?.cancel();
      throw new SlackFileUnavailableError(
        'Slack returned a login page instead of a file',
      );
    }
    if (Number(response.headers.get('content-length')) > MAX_ATTACHMENT_BYTES) {
      await response.body?.cancel();
      throw new SlackFileUnavailableError('Slack file exceeds 20 MiB');
    }
    if (!response.body) throw new Error('Slack file download has no body');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_ATTACHMENT_BYTES)
          throw new SlackFileUnavailableError('Slack file exceeds 20 MiB');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const content = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.length;
    }
    return content;
  }
  throw new SlackFileUnavailableError('Too many Slack file redirects');
};
