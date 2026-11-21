import { type FlatMessagingProvider } from 'src/engine/metadata-modules/flat-messaging-provider/types/flat-messaging-provider.type';

export const getFlatMessagingProviderMock = (
  overrides: Partial<FlatMessagingProvider> = {},
): FlatMessagingProvider => ({
  id: '20202020-1c25-4d02-bf25-6aeccf7ea411',
  universalIdentifier: '20202020-1c25-4d02-bf25-6aeccf7ea412',
  applicationId: '20202020-1c25-4d02-bf25-6aeccf7ea413',
  applicationUniversalIdentifier: '20202020-1c25-4d02-bf25-6aeccf7ea414',
  workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
  name: 'conversation-provider',
  displayName: 'Conversation Provider',
  connectionProviderUniversalIdentifier: '20202020-1c25-4d02-bf25-6aeccf7ea415',
  sendMessageLogicFunctionUniversalIdentifier: null,
  markThreadAsReadLogicFunctionUniversalIdentifier: null,
  channelObjectUniversalIdentifier: null,
  conversationStyle: null,
  deduplicateAcrossConnections: false,
  createdAt: '2026-11-21T00:00:00.000Z',
  updatedAt: '2026-11-21T00:00:00.000Z',
  ...overrides,
});
