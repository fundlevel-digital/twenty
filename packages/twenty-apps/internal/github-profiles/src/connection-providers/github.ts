import { defineConnectionProvider } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineConnectionProvider({
  universalIdentifier: IDENTIFIERS.CONNECTION_PROVIDER,
  name: 'github',
  displayName: 'GitHub Personal Access Tokens',
  logo: 'public/logo.jpeg',
  scope: 'WORKSPACE',
  type: 'api-key',
});
