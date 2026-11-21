import { RestApiClient } from 'twenty-client-sdk/rest';
import { type SlackConversation } from 'src/utils/slack';

export const upsertSlackChannel = async (
  teamId: string,
  conversation: SlackConversation,
): Promise<string> => {
  const result = await new RestApiClient({ runAs: 'application' }).post<{
    data?: { createSlackChannel: { id: string } };
    errors?: { message: string }[];
  }>('/graphql', {
    query:
      'mutation SlackChannel($data: SlackChannelCreateInput!) { createSlackChannel(data: $data, upsert: true) { id } }',
    variables: {
      data: {
        slackChannelKey: `${teamId}:${conversation.id}`,
        slackChannelId: conversation.id,
        slackTeamId: teamId,
        name:
          conversation.name ??
          (conversation.is_im
            ? `DM ${conversation.user ?? conversation.id}`
            : conversation.id),
        isSlackConnect: conversation.is_ext_shared === true,
        slackChannelType: conversation.is_im
          ? 'DM'
          : conversation.is_mpim
            ? 'GROUP_DM'
            : 'CHANNEL',
      },
    },
  });
  if (result.errors?.length || !result.data?.createSlackChannel)
    throw new Error('Slack channel record could not be synchronized');
  return result.data.createSlackChannel.id;
};
