import { defineApplicationRole } from 'twenty-sdk/define';

import {
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  INFLUENCER_ANALYTICS_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'YouTube analytics refresh role',
  description:
    'Reads influencer YouTube identities and writes the computed metrics and calculation status onto influencer analytics entries.',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    objects: [
      {
        objectUniversalIdentifier: INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          INFLUENCER_ANALYTICS_ENTRY_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
        canUpdateAllRecords: true,
      },
    ],
  },
  permissionFlagUniversalIdentifiers: [],
});
