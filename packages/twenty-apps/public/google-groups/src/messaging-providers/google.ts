import { defineMessagingProvider } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineMessagingProvider({
  universalIdentifier: IDENTIFIERS.MESSAGING,
  name: 'google-groups-mail',
  displayName: 'Google Groups',
  conversationStyle: 'email',
  connectionProvider: { universalIdentifier: IDENTIFIERS.PROVIDER },
  sendMessageLogicFunction: { universalIdentifier: IDENTIFIERS.SEND },
});
