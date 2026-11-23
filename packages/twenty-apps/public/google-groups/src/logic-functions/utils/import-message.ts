import { extname } from 'node:path';
import { z } from 'zod';
import {
  ingestMessages,
  kv,
  uploadMessageAttachment,
  type IngestMessageParticipant,
} from 'twenty-sdk/logic-function';
import { type GoogleMessage } from 'src/logic-functions/utils/google';
import { googleRequest } from 'src/logic-functions/utils/google';
import {
  attachmentParts,
  getHeader,
  parseAddresses,
  senderAddresses,
  extractText,
} from 'src/logic-functions/utils/routing';
import {
  assertActiveRevision,
  ensureChannel,
} from 'src/logic-functions/utils/preferences';
import { type GroupSettings } from 'src/types/settings';
import { resolvePerson } from 'src/logic-functions/utils/contacts';
import { updateInboxSummary } from 'src/logic-functions/utils/update-inbox-summary';

export const importMessage = async (
  connectionId: string,
  group: GroupSettings,
  message: GoogleMessage,
  revision: string,
  excludedHandles: string[] = [],
) => {
  const { settings } = await assertActiveRevision(revision);
  const channel = await ensureChannel(connectionId, group);
  const externalId = `${group.id}:${message.id}`;
  const participants: IngestMessageParticipant[] = [];
  for (const role of ['FROM', 'TO', 'CC', 'BCC'] as const) {
    for (const entry of role === 'FROM'
      ? senderAddresses(message)
      : parseAddresses(getHeader(message, role))) {
      await assertActiveRevision(revision);
      const personId = await resolvePerson(
        entry.address,
        entry.name,
        role,
        settings.contactCreation,
        [...excludedHandles, ...settings.groups.map((item) => item.email)],
      );
      participants.push({
        role,
        handle: entry.address,
        displayName: entry.name || undefined,
        ...(personId ? { personId } : {}),
      });
    }
  }
  const sender = participants.find(
    (participant) => participant.role === 'FROM',
  );
  if (
    !sender ||
    participants.filter((participant) => participant.role === 'FROM').length !==
      1
  )
    throw new Error('Google returned a message without exactly one sender.');
  if (!participants.some((participant) => participant.handle === group.email))
    participants.push({
      role: 'TO',
      handle: group.email,
      displayName: group.name,
    });
  const attachments = [];
  for (const part of attachmentParts(message.payload)) {
    if ((part.body?.size ?? 0) > 20 * 1024 * 1024)
      throw new Error('An attachment exceeds the 20 MB import limit.');
    const key = `attachment:${connectionId}:${group.id}:${message.id}:${part.body?.attachmentId ?? part.filename}`;
    let attachment = await kv.get<{ fileId: string; label: string }>(key);
    if (!attachment) {
      const data =
        part.body?.data ??
        (part.body?.attachmentId
          ? (
              await googleRequest(
                connectionId,
                `/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
                z.object({ data: z.string() }),
              )
            ).data
          : undefined);
      if (!data) continue;
      const filename = (part.filename ?? 'Attachment').slice(0, 255);
      const uploadedFile = await uploadMessageAttachment({
        filename: extname(filename)
          ? filename
          : `${filename.slice(0, 251)}.bin`,
        content: Buffer.from(data, 'base64url'),
      });
      attachment = { ...uploadedFile, label: filename };
      await kv.set(key, attachment);
    }
    attachments.push(attachment);
  }
  await assertActiveRevision(revision);
  const [saved] = await ingestMessages({
    messageChannelId: channel.id,
    messages: [
      {
        externalId,
        threadExternalId: `${group.id}:${message.threadId}`,
        subject: getHeader(message, 'subject').slice(0, 998),
        text: extractText(message),
        receivedAt: new Date(Number(message.internalDate)),
        participants,
        attachments,
      },
    ],
  });
  if (!saved)
    throw new Error('Twenty did not acknowledge the imported message.');
  await updateInboxSummary({
    groupId: group.id,
    mailbox: group.email,
    providerThreadId: message.threadId,
    threadId: saved.messageThreadId,
    senderHandle: sender.handle,
    message: {
      id: message.id,
      receivedAt: new Date(Number(message.internalDate)).toISOString(),
      sender: sender.displayName || sender.handle,
      attachments: attachments.length,
    },
  });
  await kv.set(`message:${externalId}`, {
    googleId: message.id,
    threadId: message.threadId,
    headerMessageId: getHeader(message, 'message-id'),
    references: getHeader(message, 'references'),
  });
  return saved;
};
