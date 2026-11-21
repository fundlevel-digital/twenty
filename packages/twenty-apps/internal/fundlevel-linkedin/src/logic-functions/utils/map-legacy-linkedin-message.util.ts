import { isDefined } from 'twenty-sdk/utils';
import {
  type IngestMessage,
  type IngestMessageParticipant,
} from 'twenty-sdk/logic-function';
import { type LegacyLinkedinMessage } from 'src/logic-functions/types/legacy-linkedin-message.type';

export const mapLegacyLinkedinMessage = (
  message: LegacyLinkedinMessage,
  channelHandle: string,
): IngestMessage => {
  if (
    !message.unipileMessageId ||
    !message.unipileChatId ||
    !message.sentAt ||
    !Number.isFinite(Date.parse(message.sentAt))
  )
    throw new Error(
      `Legacy message ${message.id} has no stable identifiers or timestamp`,
    );
  if (message.direction !== 'OUTBOUND' && message.direction !== 'INBOUND')
    throw new Error(`Legacy message ${message.id} has no valid direction`);
  const isOutbound = message.direction === 'OUTBOUND';
  const counterpart = message.connection;
  const handle =
    counterpart?.profileLink?.primaryLinkUrl ||
    (!isOutbound ? message.senderProfileLink?.primaryLinkUrl : undefined) ||
    `https://www.linkedin.com/in/${counterpart?.memberId || (!isOutbound ? message.senderMemberId : undefined) || message.unipileChatId}`;
  const personId = counterpart?.personId;
  const participant: IngestMessageParticipant = {
    role: message.direction === 'OUTBOUND' ? 'TO' : 'FROM',
    handle,
    displayName:
      counterpart?.name ??
      (!isOutbound ? (message.senderName ?? undefined) : undefined),
    ...(isDefined(personId) ? { personId } : {}),
  };
  return {
    externalId: message.unipileMessageId,
    threadExternalId: message.unipileChatId,
    text: message.isDeleted
      ? '[Deleted LinkedIn message]'
      : (message.text ?? ''),
    subject: counterpart?.name ?? undefined,
    receivedAt: new Date(message.sentAt),
    participants: [
      participant,
      {
        role: message.direction === 'OUTBOUND' ? 'FROM' : 'TO',
        handle: channelHandle,
      },
    ],
  };
};
