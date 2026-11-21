import { defineConnectionProvider } from 'twenty-sdk/define';
import {
  CONNECTION_UNIVERSAL_IDENTIFIER,
  AUTHORIZE_UNIVERSAL_IDENTIFIER,
  CALLBACK_UNIVERSAL_IDENTIFIER,
  ON_CONNECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/identifiers';

export default defineConnectionProvider({
  universalIdentifier: CONNECTION_UNIVERSAL_IDENTIFIER,
  name: 'slack-sync',
  displayName: 'Slack',
  logo: 'public/slack-icon.jpeg',
  type: 'custom',
  scope: 'USER',
  custom: {
    authorizeLogicFunction: {
      universalIdentifier: AUTHORIZE_UNIVERSAL_IDENTIFIER,
    },
    callbackLogicFunction: {
      universalIdentifier: CALLBACK_UNIVERSAL_IDENTIFIER,
    },
  },
  onConnectLogicFunction: {
    universalIdentifier: ON_CONNECT_UNIVERSAL_IDENTIFIER,
  },
});
