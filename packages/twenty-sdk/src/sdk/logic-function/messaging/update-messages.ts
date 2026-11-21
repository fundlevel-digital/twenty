import { type ProviderMessageMetadata } from 'twenty-shared/types';

import { postGraphqlRequest } from '@/sdk/logic-function/utils/post-graphql-request.util';

export const updateMessages = async ({
  messageChannelId,
  messages,
}: {
  messageChannelId: string;
  messages: {
    externalId: string;
    applicationFields?: {
      message?: Record<string, string | null>;
      thread?: Record<string, string | null>;
    };
    text?: string;
    providerMetadata: ProviderMessageMetadata;
  }[];
}): Promise<boolean> => {
  const { updateAppMessages } = await postGraphqlRequest<
    { input: { messageChannelId: string; messages: typeof messages } },
    { updateAppMessages: boolean }
  >({
    query: `mutation UpdateAppMessages($input: UpdateAppMessagesInput!) {
      updateAppMessages(input: $input)
    }`,
    variables: { input: { messageChannelId, messages } },
    caller: 'updateMessages',
  });

  return updateAppMessages;
};
