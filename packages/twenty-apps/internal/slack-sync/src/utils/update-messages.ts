import { RestApiClient } from 'twenty-client-sdk/rest';

// The published SDK predates the fork's update-only ingest mutation.
export const updateMessages = async (input: {
  messageChannelId: string;
  messages: {
    externalId: string;
    text?: string;
    applicationFields?: {
      message?: Record<string, string | null>;
      thread?: Record<string, string | null>;
    };
    providerMetadata: { updatedAt: string; deletedAt?: string };
  }[];
}) => {
  const result = await new RestApiClient({ runAs: 'application' }).post<{
    data?: { updateAppMessages: boolean };
    errors?: { message: string }[];
  }>('/metadata', {
    query:
      'mutation UpdateSlackMessages($input: UpdateAppMessagesInput!) { updateAppMessages(input: $input) }',
    variables: { input },
  });
  if (result.errors?.length || !result.data?.updateAppMessages)
    throw new Error('Slack message update failed');
};
