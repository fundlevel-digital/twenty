import { defineApplication } from 'twenty-sdk/define';
import { IDENTIFIERS } from './constants/identifiers';
import { OPENBOT_APPLICATION_VARIABLES } from './openbot/application-variables';
export default defineApplication({
  universalIdentifier: IDENTIFIERS.application,
  displayName: 'OpenBot',
  description:
    'Bot identities, webhook requests and Task automations with optional app integrations.',
  logo: 'public/openbot.png',
  applicationVariables: OPENBOT_APPLICATION_VARIABLES,
});
