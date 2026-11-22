import { defineApplication, FieldType } from 'twenty-sdk/define';
import { DEFAULT_SYNC_SETTINGS } from 'src/types/sync-settings';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplication({
  universalIdentifier: IDENTIFIERS.APPLICATION,
  displayName: 'GitHub Profiles',
  description:
    'Fetch GitHub profiles and social accounts linked to influencers, people and companies.',
  logo: 'public/logo.jpeg',
  author: 'Fundlevel',
  category: 'Enrichment',
  websiteUrl: 'https://github.com',
  applicationVariables: {
    SYNC_SETTINGS: {
      universalIdentifier: '8115264c-98f2-41ea-a351-c812a562ca22',
      label: 'Sync Settings',
      description:
        'Source fields, automatic sync, relation policies and anonymous access.',
      isSecret: false,
      type: FieldType.TEXT,
      value: JSON.stringify(DEFAULT_SYNC_SETTINGS),
    },
  },
  serverVariables: {
    GITHUB_CLIENT_ID: {
      description:
        'GitHub OAuth App Client ID. Register the CRM origin plus /auth/apps/callback as its callback URL.',
      isSecret: false,
      isRequired: false,
    },
    GITHUB_CLIENT_SECRET: {
      description:
        'Client secret generated for the GitHub OAuth App. Configure once before connecting GitHub accounts.',
      isSecret: true,
      isRequired: false,
    },
    GITHUB_TOKEN: {
      description:
        'Legacy optional token. Prefer GitHub API Key Connections for pooled authentication.',
      isSecret: true,
      isRequired: false,
    },
  },
});
