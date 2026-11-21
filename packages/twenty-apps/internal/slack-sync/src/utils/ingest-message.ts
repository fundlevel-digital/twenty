import { linkSlackReplies } from 'src/utils/link-slack-replies';
import { MESSAGE_ATTACHMENT_STATUS_UNIVERSAL_IDENTIFIER } from 'src/constants/schema-identifiers';
import {
  ingestMessages,
  kv,
  type IngestMessage,
} from 'twenty-sdk/logic-function';
import { type SlackFile } from 'src/utils/slack';
import {
  attachmentSetKey,
  attachmentFileKey,
  fileSet,
  importSlackAttachments,
  reportUnavailableAttachments,
} from 'src/utils/import-attachments';
import { updateMessages } from 'src/utils/update-messages';

export const ingestSlackMessage = async (
  messageChannelId: string,
  message: IngestMessage & {
    applicationFields?: Record<string, Record<string, unknown>>;
  },
  fileContext?: { token: string; files: SlackFile[] },
) => {
  const saveAttachmentStatus = async (status: string) => {
    const statusMessage = {
      ...message,
      applicationFields: {
        ...message.applicationFields,
        message: {
          ...message.applicationFields?.message,
          [MESSAGE_ATTACHMENT_STATUS_UNIVERSAL_IDENTIFIER]: status,
        },
      },
    };
    await ingestMessages({ messageChannelId, messages: [statusMessage] });
  };
  let result = await ingestMessages({
    messageChannelId,
    messages: [message],
  });
  if (
    fileContext?.files.length &&
    !(await kv.get(`deleted:${message.externalId}`))
  ) {
    const expectedFiles = fileSet(fileContext.files);
    if (result[0]?.hasAttachments) {
      const completed = await kv.get<string>(
        attachmentSetKey(message.externalId),
      );
      if (completed !== expectedFiles) {
        const uploadedFiles = await Promise.all(
          fileContext.files.map((file) =>
            kv.get(attachmentFileKey(message.externalId, file.id)),
          ),
        );
        if (!completed && uploadedFiles.every(Boolean)) {
          await kv.set(attachmentSetKey(message.externalId), expectedFiles);
        } else {
          const reason =
            'Existing native attachment batch differs from Slack files; automatic append is unsupported';
          await reportUnavailableAttachments(message.externalId, reason);
          await saveAttachmentStatus(reason);
        }
      }
    } else {
      let attachments: Awaited<ReturnType<typeof importSlackAttachments>>;
      try {
        attachments = await importSlackAttachments({
          token: fileContext.token,
          externalId: message.externalId,
          files: fileContext.files,
        });
      } catch (error) {
        await saveAttachmentStatus(
          'Import failed; check the sync job or retry the history import',
        );
        throw error;
      }
      if (attachments) {
        result = await ingestMessages({
          messageChannelId,
          messages: [{ ...message, attachments }],
        });
        if (!result[0]?.hasAttachments)
          throw new Error('Slack attachments were not persisted');
        await kv.set(attachmentSetKey(message.externalId), expectedFiles);
        await kv.delete(`attachments:unavailable:${message.externalId}`);
        await saveAttachmentStatus('Imported');
      } else {
        const diagnostic = await kv.get<{ reason: string }>(
          `attachments:unavailable:${message.externalId}`,
        );
        await saveAttachmentStatus(
          diagnostic?.reason ?? 'Slack file unavailable',
        );
      }
    }
  }
  // A delete can race the initial insert; replay its tombstone after the row exists.
  const deletedAt = await kv.get<string>(`deleted:${message.externalId}`);
  if (deletedAt)
    await updateMessages({
      messageChannelId,
      messages: [
        {
          externalId: message.externalId,
          providerMetadata: { deletedAt, updatedAt: deletedAt },
        },
      ],
    });
  if (message.applicationFields)
    await linkSlackReplies(messageChannelId, message.externalId);
  return result;
};
