import { type ExternalAssistantIdentity } from 'twenty-shared/ai';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';

export type AiChatMessageAuthor<
  TWorkspaceMember extends Pick<
    PartialWorkspaceMember,
    'id' | 'name' | 'userEmail'
  > = PartialWorkspaceMember,
> = {
  name: string;
  // false while the name is a placeholder: a member who left, or an agent not loaded yet
  isNameResolved: boolean;
} & (
  | { type: 'builtInAssistant' }
  | {
      type: 'application';
      applicationId: string;
      externalAssistant?: ExternalAssistantIdentity;
    }
  | {
      type: 'agent';
      agentId: string;
      externalAssistant?: ExternalAssistantIdentity;
    }
  | {
      type: 'member';
      senderWorkspaceMemberId: string;
      sender: TWorkspaceMember | undefined;
    }
  | { type: 'unknown'; messageId: string }
);
