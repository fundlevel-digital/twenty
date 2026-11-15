import { defineApplication } from 'twenty-sdk/define';

import { APP } from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APP.APPLICATION,
  displayName: 'LinkedIn Sync',
  description:
    'Syncs our LinkedIn accounts through Unipile: every connection and pending request, full message history, and live updates. Never sends anything.',
  logo: 'public/linkedin-logomark.svg',
  author: 'Fundlevel',
  category: 'Communication',
  applicationVariables: {
    UNIPILE_API_KEY: {
      universalIdentifier: APP.VAR_UNIPILE_API_KEY,
      label: 'Unipile API key',
      description:
        'Unipile API v2 key with access to the connected LinkedIn accounts. Used for reads only.',
      isSecret: true,
      isRequired: true,
    },
    UNIPILE_WEBHOOK_SECRET: {
      universalIdentifier: APP.VAR_UNIPILE_WEBHOOK_SECRET,
      label: 'Unipile webhook signing secret',
      description:
        'Signing secret of the Unipile webhook endpoint that points at this app. Events without a valid signature are rejected.',
      isSecret: true,
      isRequired: true,
    },
  },
});
