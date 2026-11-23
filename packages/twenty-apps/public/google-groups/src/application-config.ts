import { defineApplication } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplication({
  universalIdentifier: IDENTIFIERS.APPLICATION,
  displayName: 'Google Groups',
  description:
    'Bring Google Group mail into shared Twenty conversations and reply through Gmail.',
  author: 'Fundlevel',
  logo: 'public/logo.png',
  category: 'Communication',
  serverVariables: {
    GOOGLE_GROUPS_CLIENT_ID: {
      description:
        'Google Cloud OAuth Web client ID. Enable the Gmail API first.',
      isSecret: false,
      isRequired: true,
    },
    GOOGLE_GROUPS_CLIENT_SECRET: {
      description: 'Google Cloud OAuth Web client secret.',
      isSecret: true,
      isRequired: true,
    },
  },
});
