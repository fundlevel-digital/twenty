import { defineConnectionProvider } from 'twenty-sdk/define';

import { YOUTUBE_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineConnectionProvider({
  universalIdentifier: YOUTUBE_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  name: 'youtube',
  displayName: 'YouTube API Keys',
  scope: 'WORKSPACE',
  type: 'api-key',
});
