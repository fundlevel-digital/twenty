import { defineApplication } from 'twenty-sdk/define';

import { APP } from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APP.APPLICATION,
  displayName: 'LinkedIn Sync',
  description:
    'Syncs our LinkedIn accounts through Unipile: every connection and pending request, full message history, and live updates. Supports replies through Twenty.',
  logo: 'public/linkedin-logomark.svg',
  author: 'Fundlevel',
  category: 'Communication',
  serverVariables: {
    UNIPILE_API_KEY: {
      description: 'Unipile Service Key for hosted sign-in.',
      isSecret: true,
      isRequired: true,
    },
    UNIPILE_WEBHOOK_SECRET: {
      description: 'Legacy server route signing secret.',
      isSecret: true,
      isRequired: false,
    },
  },
  applicationVariables: {
    UNIPILE_API_KEY: {
      universalIdentifier: APP.VAR_UNIPILE_API_KEY,
      label: 'Unipile Service Key',
      description:
        'Unipile Service Key with permission to manage webhooks. Saving this key automatically configures webhook delivery, synchronization and replies.',
      isSecret: true,
      isRequired: true,
    },
  },
});
