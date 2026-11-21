import { RestApiClient } from 'twenty-client-sdk/rest';
import { MESSAGE_PARENT_UNIVERSAL_IDENTIFIER } from 'src/constants/schema-identifiers';
import { updateMessages } from 'src/utils/update-messages';

type ReplyRecord = {
  id: string;
  slackMessageId: string | null;
  providerMetadata: { updatedAt?: string } | null;
};

export const linkSlackReplies = async (
  messageChannelId: string,
  externalId: string,
): Promise<void> => {
  const client = new RestApiClient({ runAs: 'application' });
  const parent = await client.post<{
    data?: { messages: { edges: { node: { id: string } }[] } };
    errors?: object[];
  }>('/graphql', {
    query:
      'query SlackParent($externalId: String!) { messages(filter: { slackMessageId: { eq: $externalId } }, first: 1) { edges { node { id } } } }',
    variables: { externalId },
  });
  if (parent.errors?.length)
    throw new Error('Slack reply parent lookup failed');
  const parentId = parent.data?.messages.edges[0]?.node.id;
  if (!parentId) return;
  let after: string | undefined;
  do {
    const result = await client.post<{
      data?: {
        messages: {
          edges: { node: ReplyRecord }[];
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      };
      errors?: object[];
    }>('/graphql', {
      query:
        'query SlackReplies($externalId: String!, $after: String) { messages(filter: { slackReplyToMessageId: { eq: $externalId } }, first: 100, after: $after) { edges { node { id slackMessageId providerMetadata } } pageInfo { hasNextPage endCursor } } }',
      variables: { externalId, after },
    });
    if (result.errors?.length || !result.data)
      throw new Error('Slack replies lookup failed');
    const messages = result.data.messages.edges.flatMap(({ node }) =>
      node.slackMessageId && node.providerMetadata?.updatedAt
        ? [
            {
              externalId: node.slackMessageId,
              providerMetadata: { updatedAt: node.providerMetadata.updatedAt },
              applicationFields: {
                message: { [MESSAGE_PARENT_UNIVERSAL_IDENTIFIER]: parentId },
              },
            },
          ]
        : [],
    );
    if (messages.length) await updateMessages({ messageChannelId, messages });
    after = result.data.messages.pageInfo.hasNextPage
      ? result.data.messages.pageInfo.endCursor
      : undefined;
  } while (after);
};
