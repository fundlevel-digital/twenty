import { createHash } from 'node:crypto';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { z } from 'zod';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  listMessageChannels,
  type SendAppMessagePayload,
  type SendAppMessageResult,
} from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { loadPreferences } from 'src/logic-functions/utils/preferences';
import {
  googleRequest,
  googleSendAsSchema,
} from 'src/logic-functions/utils/google';

const sentSchema = z.object({ id: z.string(), threadId: z.string() });
type Reference = {
  googleId: string;
  threadId: string;
  headerMessageId: string;
  references: string;
};

export const sendMessage = async (
  payload: SendAppMessagePayload,
): Promise<SendAppMessageResult> => {
  if (payload.conversationStyle !== 'email')
    throw new Error('Google Groups supports email conversations only.');
  const { settings } = await loadPreferences();
  if (settings.paused || settings.connectionId !== payload.connectedAccountId)
    throw new Error('Resume Google Groups mail processing before replying.');
  const channel = (
    await listMessageChannels({
      connectedAccountId: payload.connectedAccountId,
    })
  ).find((item) => item.id === payload.messageChannelId);
  const group = settings.groups.find(
    (item) => item.enabled && item.email === channel?.handle,
  );
  if (!group || !payload.threadExternalId.startsWith(`${group.id}:`))
    throw new Error('This Group channel is not enabled.');
  const key = `delivery:${payload.idempotencyKey}`;
  const previous = await kv.get<{
    phase: 'PENDING' | 'SENT';
    result?: SendAppMessageResult;
  }>(key);
  if (previous?.phase === 'SENT' && previous.result) return previous.result;
  if (previous?.phase === 'PENDING')
    throw new Error(
      'The previous delivery is uncertain. Check Gmail before attempting another send.',
    );
  const aliases = await googleRequest(
    payload.connectedAccountId,
    '/settings/sendAs',
    googleSendAsSchema,
  );
  if (
    !aliases.sendAs.some(
      (alias) =>
        alias.sendAsEmail.toLowerCase() === group.email &&
        (alias.isPrimary || alias.verificationStatus === 'accepted'),
    )
  )
    throw new Error(
      `Configure and verify ${group.email} in Gmail’s Send Mail As settings before replying.`,
    );
  const reference = payload.email.inReplyToExternalId
    ? await kv.get<Reference>(`message:${payload.email.inReplyToExternalId}`)
    : null;
  if (
    !reference?.headerMessageId ||
    reference.threadId !== payload.threadExternalId.slice(group.id.length + 1)
  )
    throw new Error(
      'Sync this conversation again before replying so its Gmail reply headers are available.',
    );
  const attachments = [];
  let totalSize = 0;
  for (const attachment of payload.attachments) {
    totalSize += attachment.size;
    if (totalSize > 20 * 1024 * 1024)
      throw new Error('Attachments exceed the 20 MB send limit.');
    const response = await fetch(attachment.downloadUrl, {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('Could not download a reply attachment.');
    const content = Buffer.from(await response.arrayBuffer());
    if (content.byteLength > 20 * 1024 * 1024)
      throw new Error('An attachment exceeds the 20 MB send limit.');
    attachments.push({
      filename: attachment.filename,
      content,
      contentType: attachment.contentType,
    });
  }
  const hash = createHash('sha256')
    .update(payload.idempotencyKey)
    .digest('hex');
  const messageId = `<twenty-google-groups-${hash}@${group.email.split('@')[1]}>`;
  const composer = new MailComposer({
    from: { name: group.name, address: group.email },
    to: payload.recipients.map((recipient) => ({
      name: recipient.displayName ?? '',
      address: z.email().parse(recipient.handle),
    })),
    cc: payload.email.cc.map((recipient) => ({
      name: recipient.displayName ?? '',
      address: z.email().parse(recipient.handle),
    })),
    bcc: payload.email.bcc.map((recipient) => ({
      name: recipient.displayName ?? '',
      address: z.email().parse(recipient.handle),
    })),
    subject: payload.email.subject,
    text: payload.text,
    html: payload.email.html,
    messageId,
    inReplyTo: reference.headerMessageId,
    references: [reference.references, reference.headerMessageId]
      .filter(Boolean)
      .join(' '),
    attachments,
  });
  const compiled = composer.compile();
  compiled.keepBcc = true;
  const raw = await new Promise<Buffer>((resolve, reject) =>
    compiled.build((error, content) =>
      error ? reject(error) : resolve(content),
    ),
  );
  await kv.set(key, { phase: 'PENDING' });
  const sent = await googleRequest(
    payload.connectedAccountId,
    '/messages/send',
    sentSchema,
    { raw: raw.toString('base64url'), threadId: reference.threadId },
  );
  const result = {
    externalId: `${group.id}:${sent.id}`,
    sentAt: new Date().toISOString(),
  };
  await kv.set(key, { phase: 'SENT', result });
  await kv.set(`message:${result.externalId}`, {
    googleId: sent.id,
    threadId: sent.threadId,
    headerMessageId: messageId,
    references: [reference.references, reference.headerMessageId]
      .filter(Boolean)
      .join(' '),
  });
  return result;
};
export default defineLogicFunction({
  universalIdentifier: IDENTIFIERS.SEND,
  name: 'google-groups-send',
  timeoutSeconds: 90,
  handler: sendMessage,
});
