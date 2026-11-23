import { isDefined } from 'twenty-shared/utils';

import { type AgentChatAssistantReplyContext } from 'src/engine/metadata-modules/ai/ai-chat/types/agent-chat-assistant-reply-context.type';

export const buildAgentChatAssistantReplyProviderMetadata = (
  context: AgentChatAssistantReplyContext | undefined,
) => {
  if (!isDefined(context)) {
    return undefined;
  }

  return {
    twenty: {
      assistantReplyContext: {
        ...(context.mentionedExternalAssistantIds?.length
          ? {
              mentionedExternalAssistantIds:
                context.mentionedExternalAssistantIds,
            }
          : {}),
        isAssistantMentioned: context.isAssistantMentioned,
        isDirectAssistantChat: context.isDirectAssistantChat,
        isStructuredRequestContinuation:
          context.isStructuredRequestContinuation,
      },
    },
  };
};
