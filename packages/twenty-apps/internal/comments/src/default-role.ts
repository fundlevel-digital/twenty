import { defineApplicationRole, SystemPermissionFlag } from 'twenty-sdk/define';
import { IDENTIFIERS } from './constants/identifiers';
export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.role,
  label: 'Comments Function Role',
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.AI],
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canUpdateAllRecords: false,
    canCreateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [
      {
        objectUniversalIdentifier: IDENTIFIERS.comment,
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
      },
    ],
  },
});
