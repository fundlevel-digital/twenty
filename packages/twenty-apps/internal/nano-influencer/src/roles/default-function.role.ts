import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.role,
  label: 'NanoInfluencer Sync Role',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.UPLOAD_FILE,
    SystemPermissionFlag.APPLICATIONS,
    SystemPermissionFlag.VIEWS,
  ],
  recordsPermissions: {
    objects: [
      ...[
        IDENTIFIERS.nanoUser,
        IDENTIFIERS.creator,
        IDENTIFIERS.list,
        IDENTIFIERS.membership,
        IDENTIFIERS.search,
        IDENTIFIERS.discovery,
      ].map((objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
        canSoftDeleteAllRecords: [
          IDENTIFIERS.list,
          IDENTIFIERS.membership,
        ].some((identifier) => identifier === objectUniversalIdentifier),
      })),
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        canReadAllRecords: true,
        canCreateAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
            .universalIdentifier,
        canReadAllRecords: true,
      },
    ],
  },
});
