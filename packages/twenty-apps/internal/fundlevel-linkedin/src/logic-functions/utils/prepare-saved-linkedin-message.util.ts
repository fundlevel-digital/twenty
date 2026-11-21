import { kv, uploadMessageAttachment } from 'twenty-sdk/logic-function';
import { isDefined } from 'twenty-sdk/utils';

import { type LegacyLinkedinMessage } from 'src/logic-functions/types/legacy-linkedin-message.type';
import { mapLegacyLinkedinMessage } from 'src/logic-functions/utils/map-legacy-linkedin-message.util';

export const prepareSavedLinkedinMessage = async (
  message: LegacyLinkedinMessage,
  channelHandle: string,
) => {
  const mapped = mapLegacyLinkedinMessage(message, channelHandle);
  if (!message.hasAttachments || message.isDeleted) return mapped;

  const key = `linkedin-legacy-attachment-metadata:${message.id}`;
  let attachment = await kv.get<{ fileId: string; label: string }>(key);
  if (!isDefined(attachment)) {
    attachment = await uploadMessageAttachment({
      filename:
        'LinkedIn Attachment Metadata (Original Files Unavailable).json',
      content: Buffer.from(
        JSON.stringify(
          {
            source: 'Saved LinkedIn migration data',
            originalFilesIncluded: false,
            messageId: message.unipileMessageId,
            chatId: message.unipileChatId,
            attachmentDetails: message.attachmentDetails,
          },
          null,
          2,
        ),
      ),
    });
    await kv.set(key, attachment);
  }
  return { ...mapped, attachments: [attachment] };
};
