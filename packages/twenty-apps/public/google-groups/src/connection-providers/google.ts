import { defineConnectionProvider } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineConnectionProvider({
  universalIdentifier: IDENTIFIERS.PROVIDER,
  name: 'google-groups',
  displayName: 'Google Workspace',
  logo: 'public/logo.png',
  type: 'oauth',
  scope: 'WORKSPACE',
  identifyAccountLogicFunction: { universalIdentifier: IDENTIFIERS.IDENTIFY },
  onConnectLogicFunction: { universalIdentifier: IDENTIFIERS.CONNECT },
  oauth: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    clientIdVariable: 'GOOGLE_GROUPS_CLIENT_ID',
    clientSecretVariable: 'GOOGLE_GROUPS_CLIENT_SECRET',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.settings.basic',
    ],
    authorizationParams: { access_type: 'offline', prompt: 'consent' },
    tokenRequestContentType: 'form-urlencoded',
    usePkce: true,
  },
});
