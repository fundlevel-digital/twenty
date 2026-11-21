import { kv } from 'twenty-sdk/logic-function';
import { slackRequest, type SlackConversation } from 'src/utils/slack';

export const conversationDetailsKey = (
  connectionId: string,
  conversationId: string,
) => `conversation-details:${connectionId}:${conversationId}`;

export type ConversationKind = 'CHANNEL' | 'DM' | 'GROUP_DM';

export const conversationLabel = async (
  token: string,
  teamId: string,
  conversation: SlackConversation,
): Promise<{ name: string; kind: ConversationKind }> => {
  if (!conversation.is_im && !conversation.is_mpim)
    return { name: conversation.name ?? 'Unnamed Channel', kind: 'CHANNEL' };

  const userName = async (userId: string): Promise<string> => {
    const key = `slack-user-name:${teamId}:${userId}`;
    const saved = await kv.get<{ name: string; updatedAt: number }>(key);
    if (saved && Date.now() - saved.updatedAt < 86400000) return saved.name;
    const { user } = await slackRequest<{
      user: {
        real_name?: string;
        name?: string;
        profile?: { display_name?: string; real_name?: string };
      };
    }>(token, 'users.info', { user: userId });
    const name =
      user.profile?.display_name ||
      user.profile?.real_name ||
      user.real_name ||
      user.name ||
      'Slack Member';
    await kv.set(key, { name, updatedAt: Date.now() });
    return name;
  };
  if (conversation.is_im)
    return {
      name: conversation.user
        ? await userName(conversation.user)
        : 'Direct Message',
      kind: 'DM',
    };

  const { members } = await slackRequest<{ members: string[] }>(
    token,
    'conversations.members',
    {
      channel: conversation.id,
      limit: '8',
    },
  );
  const names = [];
  for (const member of members) names.push(await userName(member));
  return { name: names.join(', ') || 'Group Message', kind: 'GROUP_DM' };
};
