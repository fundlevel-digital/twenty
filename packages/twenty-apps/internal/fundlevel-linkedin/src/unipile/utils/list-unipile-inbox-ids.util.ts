import { UnipileMessaging } from '@unipile/sdk';
import { kv } from 'twenty-sdk/logic-function';
import { type LinkedinSettings } from 'src/types/linkedin-settings.type';

import { requestUnipile } from 'src/unipile/utils/request-unipile.util';
import { getUnipileRequestOptions } from 'src/unipile/utils/get-unipile-request-options.util';

export const listUnipileInboxIds = async (
  accountId: string,
): Promise<string[]> => {
  const { data } = await requestUnipile(
    'list inboxes',
    () =>
      new UnipileMessaging().getInboxesList({
        ...getUnipileRequestOptions(),
        path: { account_id: accountId },
      }),
    { accountId },
  );

  const settings = await kv.get<LinkedinSettings>(
    `linkedin-account-settings:${accountId}`,
  );
  return data.data
    .filter((inbox) => !inbox.disabled)
    .filter(
      (inbox) =>
        settings?.areSalesNavigatorChatsImported !== false ||
        !inbox.id.includes('SALES_NAVIGATOR'),
    )
    .filter(
      (inbox) =>
        settings?.areInMailChatsImported !== false ||
        !inbox.id.includes('INMAIL'),
    )
    .map((inbox) => inbox.id);
};
