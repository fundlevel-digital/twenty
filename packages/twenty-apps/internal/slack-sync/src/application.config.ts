import { defineApplication } from 'twenty-sdk/define';
import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CLIENT_ID_UNIVERSAL_IDENTIFIER,
  CLIENT_SECRET_UNIVERSAL_IDENTIFIER,
  SIGNING_SECRET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Slack Sync',
  logo: 'public/slack-icon.jpeg',
  description: 'Client conversations from Slack, on your People and Companies.',
  applicationVariables: {
    SLACK_CLIENT_ID: {
      universalIdentifier: CLIENT_ID_UNIVERSAL_IDENTIFIER,
      description: 'Client ID of your internal Slack app',
      isSecret: false,
      isRequired: true,
    },
    SLACK_CLIENT_SECRET: {
      universalIdentifier: CLIENT_SECRET_UNIVERSAL_IDENTIFIER,
      description: 'Client secret of your internal Slack app',
      isSecret: true,
      isRequired: true,
    },
    SLACK_SIGNING_SECRET: {
      universalIdentifier: SIGNING_SECRET_UNIVERSAL_IDENTIFIER,
      description: 'Signing secret of your internal Slack app',
      isSecret: true,
      isRequired: true,
    },
  },
});
