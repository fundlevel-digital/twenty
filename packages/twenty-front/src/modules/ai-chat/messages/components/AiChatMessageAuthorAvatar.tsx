import { AssistantAvatar } from 'twenty-ui/components/data-display';
import { Avatar } from 'twenty-ui/primitives/data-display';

import { AiChatAssistantAvatar } from '@/ai-chat/components/AiChatAssistantAvatar';
import { type AiChatMessageAuthor } from '@/ai-chat/messages/types/AiChatMessageAuthor';
import { AppChip } from '@/applications/components/AppChip';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

type AiChatMessageAuthorAvatarProps = {
  author: AiChatMessageAuthor;
};

export const AiChatMessageAuthorAvatar = ({
  author,
}: AiChatMessageAuthorAvatarProps) => {
  switch (author.type) {
    case 'builtInAssistant':
      return <AiChatAssistantAvatar />;
    case 'application':
      if (author.externalAssistant) {
        return author.externalAssistant.avatarUrl ? (
          <Avatar
            size="sm"
            name={author.name}
            src={author.externalAssistant.avatarUrl ?? undefined}
            colorSeed={author.externalAssistant.id}
            shape="circle"
          />
        ) : (
          <AssistantAvatar size={24} />
        );
      }
      return <AppChip applicationId={author.applicationId} chipOnly rounded />;
    case 'agent':
      if (author.externalAssistant) {
        return author.externalAssistant.avatarUrl ? (
          <Avatar
            name={author.name}
            src={author.externalAssistant.avatarUrl}
            colorSeed={author.agentId}
            size="sm"
            shape="circle"
          />
        ) : (
          <AssistantAvatar size={24} />
        );
      }
      return (
        <Avatar
          colorSeed={author.agentId}
          name={author.name}
          size="sm"
          shape="circle"
        />
      );
    case 'member':
      return (
        <Avatar
          src={getAbsoluteImageUrl(author.sender?.avatarUrl)}
          colorSeed={author.senderWorkspaceMemberId}
          name={author.name}
          size="sm"
          shape="circle"
        />
      );
    case 'unknown':
      return (
        <Avatar
          colorSeed={author.messageId}
          name={author.name}
          size="sm"
          shape="circle"
        />
      );
  }
};
