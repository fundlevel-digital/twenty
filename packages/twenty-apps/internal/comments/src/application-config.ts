import { defineApplication } from 'twenty-sdk/define';
import { IDENTIFIERS } from './constants/identifiers';
import { OPENBOT_APPLICATION_VARIABLES } from './openbot/application-variables';
export default defineApplication({
  universalIdentifier: IDENTIFIERS.application,
  displayName: 'Comments',
  description:
    'Collaborate on any record with comment threads and Inbox mentions.',
  applicationVariables: OPENBOT_APPLICATION_VARIABLES,
});
