import { UnipileMessaging } from '@unipile/sdk';

import { UNIPILE_CHATS_PAGE_MAX_SIZE } from 'src/unipile/constants/unipile-chats-page-max-size.constant';
import { type UnipileChat } from 'src/unipile/types/unipile-chat.type';
import { type UnipilePage } from 'src/unipile/types/unipile-page.type';
import { requestUnipile } from 'src/unipile/utils/request-unipile.util';
import { getUnipileRequestOptions } from 'src/unipile/utils/get-unipile-request-options.util';

export const listUnipileChats = async ({
  accountId,
  inboxId,
  cursor,
  limit,
  deadlineAtMs,
}: {
  accountId: string;
  inboxId: string;
  cursor?: string;
  limit: number;
  deadlineAtMs?: number;
}): Promise<UnipilePage<UnipileChat>> => {
  const { data } = await requestUnipile(
    'list inbox chats',
    () =>
      new UnipileMessaging().getInboxChatsList({
        ...getUnipileRequestOptions(),
        path: { account_id: accountId, inbox_id: inboxId },
        query: {
          cursor,
          limit: Math.min(limit, UNIPILE_CHATS_PAGE_MAX_SIZE),
        },
      }),
    { deadlineAtMs, accountId },
  );

  return {
    items: data.data,
    nextCursor: data.next_cursor,
    totalCount: data.total_count,
  };
};
