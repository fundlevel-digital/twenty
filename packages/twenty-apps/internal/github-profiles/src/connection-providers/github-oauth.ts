import { defineConnectionProvider } from 'twenty-sdk/define';

export default defineConnectionProvider({
  universalIdentifier: 'dfeec279-0e4e-4c50-a726-6300064f20af',
  name: 'github-oauth',
  displayName: 'GitHub OAuth',
  logo: 'public/logo.jpeg',
  scope: 'WORKSPACE',
  type: 'oauth',
  oauth: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    clientIdVariable: 'GITHUB_CLIENT_ID',
    clientSecretVariable: 'GITHUB_CLIENT_SECRET',
    scopes: [],
    tokenRequestContentType: 'form-urlencoded',
    usePkce: true,
    authorizationParams: { prompt: 'select_account' },
  },
});
