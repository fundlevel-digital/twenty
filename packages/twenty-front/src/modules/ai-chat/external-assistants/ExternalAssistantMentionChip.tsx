import { getCoreAgentLink } from '@/object-core/agents/utils/getCoreAgentLink';
import { LinkChip } from '@/ui/navigation/link/components/LinkChip/LinkChip';
import { AssistantAvatar } from 'twenty-ui/components/data-display';
import { Avatar } from 'twenty-ui/primitives/data-display';

type ExternalAssistantMentionChipProps = {
  id: string;
  name: string;
  avatarUrl?: string;
};
export const ExternalAssistantMentionChip = ({
  id,
  name,
  avatarUrl,
}: ExternalAssistantMentionChipProps) => (
  <LinkChip
    to={getCoreAgentLink(id)}
    variant="soft"
    startElement={
      avatarUrl ? (
        <Avatar
          size="sm"
          name={name}
          colorSeed={id}
          src={avatarUrl}
          shape="circle"
        />
      ) : (
        <AssistantAvatar size={14} />
      )
    }
  >{`@${name}`}</LinkChip>
);
