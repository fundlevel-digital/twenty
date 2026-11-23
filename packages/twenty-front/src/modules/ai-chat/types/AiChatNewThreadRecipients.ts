export type AiChatNewThreadRecipients = {
  externalAssistants?: { id: string; name: string; avatarUrl: string | null }[];
  channelId: string | null;
  isAssistantParticipant: boolean;
  recipientWorkspaceMemberIds: string[];
};
