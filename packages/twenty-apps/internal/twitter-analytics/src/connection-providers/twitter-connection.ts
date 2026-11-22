import { defineConnectionProvider } from 'twenty-sdk/define';

import { TWITTER_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineConnectionProvider({
  universalIdentifier: TWITTER_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  name: 'twitter',
  displayName: 'Twitter API Keys',
  scope: 'WORKSPACE',
  type: 'api-key',
});
