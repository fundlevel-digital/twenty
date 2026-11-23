import { isDefined } from 'twenty-shared/utils';

import { type AiChatNewThreadRecipients } from '@/ai-chat/types/AiChatNewThreadRecipients';
import { type AiChatParticipantMention } from '@/ai-chat/composer/types/AiChatParticipantMention';

export const getAiChatNewThreadDirectMessageWorkspaceMemberId = ({
  isDirectMessageIdentityEnabled,
  newInboxChatRecipients,
  isAssistantMentioned,
  hasExternalAssistant = false,
  channelId,
  initialRecipients,
  participantMentions,
}: {
  isDirectMessageIdentityEnabled: boolean;
  newInboxChatRecipients: AiChatNewThreadRecipients | undefined;
  isAssistantMentioned: boolean;
  hasExternalAssistant?: boolean;
  channelId: string | null | undefined;
  initialRecipients: AiChatParticipantMention[];
  participantMentions: AiChatParticipantMention[];
}): string | undefined => {
  if (
    !isDirectMessageIdentityEnabled ||
    !isDefined(newInboxChatRecipients) ||
    newInboxChatRecipients.isAssistantParticipant ||
    isAssistantMentioned ||
    hasExternalAssistant ||
    isDefined(channelId)
  ) {
    return undefined;
  }

  const addressedWorkspaceMemberIds = [
    ...new Set(
      [...initialRecipients, ...participantMentions].map(
        ({ workspaceMemberId }) => workspaceMemberId,
      ),
    ),
  ];

  return addressedWorkspaceMemberIds.length === 1
    ? addressedWorkspaceMemberIds[0]
    : undefined;
};
