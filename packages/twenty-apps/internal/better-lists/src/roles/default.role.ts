import { defineApplicationRole, SystemPermissionFlag } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.ROLE,
  label: 'Better Lists App Role',
  description:
    'Reads parent records, creates list entries, and configures list metadata and navigation within the signed-in member permissions.',
  canUpdateAllSettings: false,
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    canReadAllRecords: true,
    canCreateAllRecords: true,
    // Hosts without the create-permission feature flag enforce updates on creation.
    canUpdateAllRecords: true,
  },
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.DATA_MODEL,
    SystemPermissionFlag.LAYOUTS,
  ],
});
