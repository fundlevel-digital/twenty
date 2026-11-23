import { AssistantAvatar } from 'twenty-ui/components/data-display';
import { Avatar, Chip } from 'twenty-ui/primitives/data-display';

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
  <Chip
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
  >{`@${name}`}</Chip>
);
