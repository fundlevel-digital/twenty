import { type MessagingProviderConversationStyle } from '@/application/messagingProviderConversationStyleType';
import { type SyncableEntityOptions } from '@/application/syncableEntityOptionsType';

export type MessagingProviderManifest = SyncableEntityOptions & {
  name: string;
  displayName: string;
  connectionProvider: SyncableEntityOptions;
  channelObject?: SyncableEntityOptions;
  sendMessageLogicFunction?: SyncableEntityOptions;
  markThreadAsReadLogicFunction?: SyncableEntityOptions;
  deduplicateAcrossConnections?: boolean;
  conversationStyle?: MessagingProviderConversationStyle;
};
