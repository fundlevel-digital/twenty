export type AgentChatMessageAddressing = {
  mentionedExternalAssistantIds?: string[];
  mentionedWorkspaceMemberIds: string[];
  initialRecipientWorkspaceMemberIds: string[];
};
