type Association = {
  messageChannelId: string;
  direction: string;
};

type Participant = {
  personId: string | null;
  role: string;
  handle: string;
};

export type EmailMessage = {
  id: string;
  headerMessageId: string | null;
  messageThreadId: string | null;
  receivedAt: string | null;
  subject: string | null;
  text: string | null;
  isDraft: boolean;
  associations: Association[];
  participants: Participant[];
};

export type Mailbox = {
  id: string;
  connectedAccountId: string;
  handle: string;
};

export const selectReply = (
  messages: EmailMessage[],
  contactIds: string[],
  mailboxes: Mailbox[],
) => {
  const eligibleMessages = messages
    .filter(
      (message) =>
        !message.isDraft &&
        Boolean(message.messageThreadId) &&
        Number.isFinite(Date.parse(message.receivedAt ?? '')) &&
        message.associations.some((association) =>
          mailboxes.some(
            (mailbox) => mailbox.id === association.messageChannelId,
          ),
        ),
    )
    .sort(
      (left, right) =>
        Date.parse(right.receivedAt!) - Date.parse(left.receivedAt!) ||
        left.id.localeCompare(right.id),
    );

  const latestActivity = eligibleMessages[0];
  if (!latestActivity) {
    throw new Error(
      'No synced email conversation exists in an accessible mailbox.',
    );
  }
  if (
    eligibleMessages.some(
      (message) =>
        message.receivedAt === latestActivity.receivedAt &&
        message.messageThreadId !== latestActivity.messageThreadId,
    )
  ) {
    throw new Error(
      'Several conversations have the same latest activity time. Choose a conversation before drafting.',
    );
  }

  const threadMessages = eligibleMessages.filter(
    (message) => message.messageThreadId === latestActivity.messageThreadId,
  );

  const incomingEmail = threadMessages.find(
    (message) =>
      message.participants.some(
        (participant) =>
          participant.role === 'FROM' &&
          contactIds.includes(participant.personId ?? '') &&
          Boolean(participant.handle),
      ) &&
      message.associations.some(
        (association) =>
          association.direction === 'INCOMING' &&
          mailboxes.some(
            (mailbox) => mailbox.id === association.messageChannelId,
          ),
      ),
  );

  if (!incomingEmail?.headerMessageId) {
    throw new Error(
      'The latest conversation has no incoming contact email with a Header Message ID.',
    );
  }

  const matchingMailboxes = mailboxes.filter((mailbox) =>
    incomingEmail.associations.some(
      (association) =>
        association.direction === 'INCOMING' &&
        association.messageChannelId === mailbox.id,
    ),
  );
  const activeMailboxIds = latestActivity.associations.map(
    (association) => association.messageChannelId,
  );
  const activeMailboxes = matchingMailboxes.filter((mailbox) =>
    activeMailboxIds.includes(mailbox.id),
  );
  const candidates =
    activeMailboxes.length > 0 ? activeMailboxes : matchingMailboxes;
  if (candidates.length !== 1) {
    throw new Error(
      'Several mailboxes own this conversation. Choose a mailbox before drafting.',
    );
  }

  const sender = incomingEmail.participants.find(
    (participant) =>
      participant.role === 'FROM' &&
      contactIds.includes(participant.personId ?? '') &&
      Boolean(participant.handle),
  )!;
  const mailbox = candidates[0];
  const subject = incomingEmail.subject ?? '';
  const contextMessages = threadMessages.slice(0, 12);
  if (!contextMessages.some((message) => message.id === incomingEmail.id)) {
    contextMessages[contextMessages.length - 1] = incomingEmail;
  }

  return {
    messageThreadId: incomingEmail.messageThreadId!,
    parentMessageId: incomingEmail.id,
    inReplyTo: incomingEmail.headerMessageId,
    connectedAccountId: mailbox.connectedAccountId,
    fromHandle: mailbox.handle,
    recipients: { to: sender.handle, cc: '', bcc: '' },
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
    conversation: contextMessages.reverse().map((message) => ({
      direction: message.associations.find(
        (association) => association.messageChannelId === mailbox.id,
      )?.direction,
      receivedAt: message.receivedAt,
      text: message.text?.slice(0, 12000) ?? '',
      isReplyTarget: message.id === incomingEmail.id,
    })),
  };
};
