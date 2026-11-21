import { CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/schema-identifiers';
import { defineMessagingProvider } from 'twenty-sdk/define';
import {
  CONNECTION_UNIVERSAL_IDENTIFIER,
  MESSAGING_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';

const provider: Parameters<typeof defineMessagingProvider>[0] & {
  deduplicateAcrossConnections: boolean;
  channelObject: { universalIdentifier: string };
} = {
  universalIdentifier: MESSAGING_UNIVERSAL_IDENTIFIER,
  name: 'slack-sync',
  displayName: 'Slack',
  connectionProvider: { universalIdentifier: CONNECTION_UNIVERSAL_IDENTIFIER },
  channelObject: { universalIdentifier: CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER },
  conversationStyle: 'chat',
  deduplicateAcrossConnections: true,
};
export default defineMessagingProvider(provider);
