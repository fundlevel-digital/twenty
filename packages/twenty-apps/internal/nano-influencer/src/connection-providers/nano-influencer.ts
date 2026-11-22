import { defineConnectionProvider } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineConnectionProvider({
  universalIdentifier: IDENTIFIERS.connectionProvider,
  name: 'nano-influencer',
  displayName: 'NanoInfluencer API Connections',
  scope: 'WORKSPACE',
  type: 'api-key',
});
