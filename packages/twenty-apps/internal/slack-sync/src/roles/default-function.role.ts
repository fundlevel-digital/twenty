import { CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/schema-identifiers';
import {
  defineApplicationRole,
  SystemPermissionFlag,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { ROLE_UNIVERSAL_IDENTIFIER } from 'src/constants/identifiers';

export default defineApplicationRole({
  universalIdentifier: ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Slack Sync function role',
  description:
    'Links Slack conversations and applies member contact preferences.',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    objects: [
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier: CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread
            .universalIdentifier,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
            .universalIdentifier,
        canReadAllRecords: true,
      },
    ],
  },
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.UPLOAD_FILE],
});
