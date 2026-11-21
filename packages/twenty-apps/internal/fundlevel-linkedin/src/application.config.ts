import { defineApplication } from 'twenty-sdk/define';

import { APP, REBUILD } from 'src/constants/universal-identifiers';

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
      description: 'Unipile API key for hosted sign-in and webhook routing.',
      isSecret: true,
      isRequired: true,
    },
    UNIPILE_WEBHOOK_SECRET: {
      description: 'Unipile webhook signing secret.',
      isSecret: true,
      isRequired: true,
    },
  },
  applicationVariables: {
    CONNECTION_PRIVACY_READY: {
      universalIdentifier: REBUILD.VAR_PRIVACY_READY,
      label: 'Connection Privacy Configured',
      description:
        'Set to true only after scripts/configure-connection-privacy.mjs has installed native private-record sharing and verified member and embedded-token access.',
      type: 'BOOLEAN',
      value: false,
      isSecret: false,
      isRequired: false,
    },
    UNIPILE_API_KEY: {
      universalIdentifier: APP.VAR_UNIPILE_API_KEY,
      label: 'Unipile API Key',
      description:
        'Unipile API v2 key with access to the connected LinkedIn accounts. Used for synchronization and replies.',
      isSecret: true,
      isRequired: true,
    },
    UNIPILE_WEBHOOK_SECRET: {
      universalIdentifier: APP.VAR_UNIPILE_WEBHOOK_SECRET,
      label: 'Unipile Webhook Signing Secret',
      description:
        'Signing secret of the Unipile webhook endpoint that points at this app. Events without a valid signature are rejected.',
      isSecret: true,
      isRequired: true,
    },
  },
});
