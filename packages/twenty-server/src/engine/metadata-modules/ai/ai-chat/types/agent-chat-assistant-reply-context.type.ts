export type AgentChatAssistantReplyContext = {
  mentionedExternalAssistantIds?: string[];
  isAssistantMentioned: boolean;
  isDirectAssistantChat: boolean;
  isStructuredRequestContinuation: boolean;
};
