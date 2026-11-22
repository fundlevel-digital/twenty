import { FieldType } from 'twenty-sdk/define';

import {
  OPENBOT_CONNECTIONS_VARIABLE_IDENTIFIER,
  OPENBOT_REPLY_URL_VARIABLE_IDENTIFIER,
} from './constants';

export const OPENBOT_APPLICATION_VARIABLES = {
  OPENBOT_CONNECTIONS: {
    universalIdentifier: OPENBOT_CONNECTIONS_VARIABLE_IDENTIFIER,
    label: 'OpenBot Connections',
    description:
      'Private JSON array of agent IDs, names, avatar URLs, webhook URLs and signing secrets. Only public agent profiles are exposed to comment authors.',
    type: FieldType.TEXT as const,
    isSecret: true as const,
  },
  OPENBOT_REPLY_URL: {
    universalIdentifier: OPENBOT_REPLY_URL_VARIABLE_IDENTIFIER,
    label: 'OpenBot Reply URL',
    description:
      'The public HTTPS URL of this application’s /comments/openbot/reply route.',
    type: FieldType.TEXT as const,
    isSecret: false as const,
    value: '',
  },
};
