import { defineMessagingProvider } from 'twenty-sdk/define';

import {
  USER_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  USER_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineMessagingProvider({
  universalIdentifier: USER_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-user-emails',
  displayName: 'PlusVibe emails',
  conversationStyle: 'email',
  connectionProvider: {
    universalIdentifier: USER_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  },
});
