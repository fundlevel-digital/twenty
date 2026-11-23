import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.ROLE,
  label: 'Google Groups Sync',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    objects: ['person', 'message', 'messageThread'].map((name) => ({
      objectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS[
          name as 'person' | 'message' | 'messageThread'
        ].universalIdentifier,
      canReadAllRecords: true,
      canCreateAllRecords: true,
      canUpdateAllRecords: true,
    })),
  },
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.APPLICATIONS,
    SystemPermissionFlag.UPLOAD_FILE,
  ],
});
