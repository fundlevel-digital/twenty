import { defineApplicationRole, SystemPermissionFlag } from 'twenty-sdk/define';
import { IDENTIFIERS } from './constants/identifiers';
export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.role,
  label: 'OpenBot Function Role',
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.APPLICATIONS,
    SystemPermissionFlag.WORKFLOWS,
    SystemPermissionFlag.AI,
  ],
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canCreateAllRecords: false,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [IDENTIFIERS.bot, IDENTIFIERS.receipt].map(
      (objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
      }),
    ),
  },
});
