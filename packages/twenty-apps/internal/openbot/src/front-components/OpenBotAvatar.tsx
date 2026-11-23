import { AssistantAvatar } from 'twenty-ui/components/data-display';
import { Avatar } from 'twenty-ui/primitives/data-display';

type OpenBotAvatarProps = { name: string; avatarUrl?: string | null };

export const OpenBotAvatar = ({ name, avatarUrl }: OpenBotAvatarProps) =>
  avatarUrl ? (
    <Avatar src={avatarUrl} name={name} size="md" />
  ) : (
    <AssistantAvatar size={24} aria-label={name} />
  );
