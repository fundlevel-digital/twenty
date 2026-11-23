import { type AgentChatInboxDeliveryResult } from 'src/engine/metadata-modules/ai/ai-chat/types/agent-chat-inbox-delivery-result.type';

export type AgentChatMemberMessageResult = {
  messageId: string;
  externalAssistantDeliveryFailed?: boolean;
  isQueued: boolean;
  streamId?: string;
  turnId?: string;
  delivery: AgentChatInboxDeliveryResult;
};
