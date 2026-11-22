import {
  defineApplicationRole,
  SystemPermissionFlag,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.ROLE,
  label: 'GitHub Profiles Sync',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    objects: [
      ...[IDENTIFIERS.PERSON_LINK, IDENTIFIERS.COMPANY_LINK].map(
        (objectUniversalIdentifier) => ({
          objectUniversalIdentifier,
          canReadAllRecords: true,
          canCreateAllRecords: true,
          canUpdateAllRecords: true,
          canSoftDeleteAllRecords: true,
        }),
      ),
      ...[
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      ].map((objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadAllRecords: true,
      })),
      {
        objectUniversalIdentifier: IDENTIFIERS.PROFILE,
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
      },
      {
        objectUniversalIdentifier: IDENTIFIERS.INFLUENCER,
        canReadAllRecords: true,
      },
    ],
  },
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.UPLOAD_FILE,
    SystemPermissionFlag.APPLICATIONS,
    SystemPermissionFlag.WORKFLOWS,
  ],
});
