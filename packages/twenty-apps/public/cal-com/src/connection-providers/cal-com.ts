import { CAL_COM_OAUTH_CONFIG } from 'src/constants/oauth-config';
import { defineConnectionProvider } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineConnectionProvider({
  universalIdentifier: IDENTIFIERS.PROVIDER,
  name: 'cal-com',
  displayName: 'Cal.com',
  type: 'oauth',
  scope: 'USER',
  onConnectLogicFunction: { universalIdentifier: IDENTIFIERS.REGISTER },
  onDisconnectLogicFunction: { universalIdentifier: IDENTIFIERS.DISCONNECT },
  oauth: CAL_COM_OAUTH_CONFIG,
});
