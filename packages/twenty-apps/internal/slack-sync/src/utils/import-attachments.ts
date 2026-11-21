import {
  kv,
  uploadMessageAttachment,
  type IngestMessageAttachment,
} from 'twenty-sdk/logic-function';
import { slackRequest, type SlackFile } from 'src/utils/slack';
import {
  downloadSlackFile,
  MAX_MESSAGE_ATTACHMENT_BYTES,
  SlackFileUnavailableError,
} from 'src/utils/download-file';

export const attachmentSetKey = (externalId: string) =>
  `attachments:complete:${externalId}`;
export const attachmentFileKey = (externalId: string, fileId: string) =>
  `attachments:file:${externalId}:${fileId}`;
export const fileSet = (files: SlackFile[]) =>
  [...new Set(files.map((file) => file.id))].sort().join(',');

export const reportUnavailableAttachments = async (
  externalId: string,
  reason: string,
) => {
  console.warn(
    `[slack-sync] attachments for ${externalId} unavailable: ${reason}`,
  );
  await kv.set(`attachments:unavailable:${externalId}`, {
    reason,
    updatedAt: new Date().toISOString(),
  });
};

export const importSlackAttachments = async ({
  token,
  externalId,
  files,
}: {
  token: string;
  externalId: string;
  files: SlackFile[];
}): Promise<IngestMessageAttachment[] | null> => {
  const signal = AbortSignal.timeout(60000);
  const uniqueFiles = [
    ...new Map(files.map((file) => [file.id, file])).values(),
  ];
  const cachedFiles = new Map<string, IngestMessageAttachment>();
  const downloadedFiles: { file: SlackFile; content: Uint8Array }[] = [];
  let totalBytes = 0;
  try {
    for (const file of uniqueFiles) {
      const cached = await kv.get<IngestMessageAttachment>(
        attachmentFileKey(externalId, file.id),
      );
      if (cached) {
        cachedFiles.set(file.id, cached);
        continue;
      }
      let downloadableFile = file;
      if (
        !file.url_private &&
        !file.url_private_download &&
        !file.is_external
      ) {
        try {
          downloadableFile = (
            await slackRequest<{ file: SlackFile }>(token, 'files.info', {
              file: file.id,
            })
          ).file;
        } catch (error) {
          if (
            error instanceof Error &&
            /Slack (file_not_found|not_allowed|missing_scope|access_denied)/.test(
              error.message,
            )
          )
            throw new SlackFileUnavailableError(
              'Slack file unavailable to this connection',
            );
          throw error;
        }
      }
      const content = await downloadSlackFile({
        token,
        file: downloadableFile,
        signal,
      });
      totalBytes += content.byteLength;
      if (totalBytes > MAX_MESSAGE_ATTACHMENT_BYTES)
        throw new SlackFileUnavailableError(
          'Slack message files exceed 40 MiB',
        );
      downloadedFiles.push({ file, content });
    }
  } catch (error) {
    if (!(error instanceof SlackFileUnavailableError)) throw error;
    await reportUnavailableAttachments(externalId, error.message);
    return null;
  }
  // The native batch is immutable: download every file before committing any attachments.
  for (const { file, content } of downloadedFiles) {
    const filename =
      (file.name || file.title || file.id)
        .replace(/[\\/\u0000-\u001f\u007f]/g, '_')
        .slice(0, 255) || file.id;
    const uploaded = await uploadMessageAttachment({
      filename,
      content,
      signal,
    });
    await kv.set(attachmentFileKey(externalId, file.id), uploaded);
    cachedFiles.set(file.id, uploaded);
  }
  return uniqueFiles.map((file) => cachedFiles.get(file.id)!);
};
