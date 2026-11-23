import { type SendInboxMessageToolCall } from '@/application/sendInboxMessageToolCallType';

export type SendInboxMessageInput = {
  externalAssistantId?: string;
  workspaceMemberIds: string[];
  threadKey: string;
  idempotencyKey: string;
  title: string;
  text: string;
  toolCall?: SendInboxMessageToolCall;
};
