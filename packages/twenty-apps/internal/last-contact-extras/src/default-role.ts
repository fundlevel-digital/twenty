import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  INFLUENCER_CONTACT_OBJECT_UNIVERSAL_IDENTIFIER,
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCTION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: `${APP_DISPLAY_NAME} Function Role`,
  description:
    'Reads synced email and contact links, updates email counts on people, and keeps influencer contact relations current.',
  recordsPermissions: {
    objects: [
      {
        objectUniversalIdentifier: PRODUCTION_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
        canCreateAllRecords: false,
        canUpdateAllRecords: true,
      },
      {
        objectUniversalIdentifier: INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
        canCreateAllRecords: false,
        canUpdateAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          INFLUENCER_CONTACT_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        canReadAllRecords: true,
        canCreateAllRecords: false,
        canUpdateAllRecords: true,
      },
      ...[
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageParticipant
          .universalIdentifier,
      ].map((objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadAllRecords: true,
      })),
    ],
  },
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
});
