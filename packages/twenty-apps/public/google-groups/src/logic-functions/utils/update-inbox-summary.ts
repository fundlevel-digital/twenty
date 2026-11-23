import { kv } from 'twenty-sdk/logic-function';
import { RestApiClient } from 'twenty-client-sdk/rest';

type InboxMessage = {
  id: string;
  receivedAt: string;
  sender: string;
  attachments: number;
};
export type InboxSummary = {
  latest: InboxMessage;
  attachmentsByMessage: Record<string, number>;
};

type UpdateInboxSummaryOptions = {
  groupId: string;
  mailbox: string;
  providerThreadId: string;
  threadId: string;
  message: InboxMessage;
  senderHandle: string;
};

export const updateInboxSummary = async ({
  groupId,
  mailbox,
  providerThreadId,
  threadId,
  message,
  senderHandle,
}: UpdateInboxSummaryOptions) => {
  if (senderHandle.toLowerCase() === mailbox.toLowerCase()) return;
  const key = `inbox:${groupId}:${providerThreadId}`;
  const previous = await kv.get<InboxSummary>(key);
  const summary: InboxSummary = {
    latest:
      previous && previous.latest.receivedAt > message.receivedAt
        ? previous.latest
        : message,
    attachmentsByMessage: {
      ...previous?.attachmentsByMessage,
      [message.id]: message.attachments,
    },
  };
  await new RestApiClient({ runAs: 'application' }).patch(
    `/rest/messageThreads/${threadId}`,
    {
      googleGroupsMailbox: mailbox,
      googleGroupsSender: summary.latest.sender,
      googleGroupsReceivedAt: summary.latest.receivedAt,
      googleGroupsAttachments: Object.values(
        summary.attachmentsByMessage,
      ).reduce((total, count) => total + count, 0),
    },
  );
  await kv.set(key, summary);
};
