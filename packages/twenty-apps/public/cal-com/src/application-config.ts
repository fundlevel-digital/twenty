import { defineApplication } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplication({
  universalIdentifier: IDENTIFIERS.APPLICATION,
  displayName: 'Cal.com',
  description:
    'Sync Cal.com bookings, attendees and qualification answers into Twenty with personal OAuth connections.',
  logo: 'public/logo.svg',
  author: 'Fundlevel',
  category: 'Productivity',
  websiteUrl: 'https://cal.com',
  serverVariables: {
    CAL_COM_CLIENT_ID: {
      description: 'Cal.com OAuth client ID.',
      isSecret: false,
      isRequired: true,
    },
    CAL_COM_CLIENT_SECRET: {
      description: 'Cal.com OAuth client secret.',
      isSecret: true,
      isRequired: true,
    },
  },
});
