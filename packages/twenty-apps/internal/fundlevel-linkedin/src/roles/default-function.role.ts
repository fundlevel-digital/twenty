import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
  defineApplicationRole,
} from 'twenty-sdk/define';

import {
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  OBJECT,
  REBUILD,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Fundlevel LinkedIn Function Role',
  description:
    'Matches LinkedIn participants to People by profile link or name, creates People for new contacts, sets their LinkedIn profile picture when missing and reads company names to tell namesakes apart.',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    canReadAllRecords: false,
    canCreateAllRecords: false,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [
      ...[
        OBJECT.ACCOUNT,
        OBJECT.CONNECTION,
        REBUILD.SYNC_LEASE,
      ].map((objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadAllRecords: true,
        canCreateAllRecords: [
          OBJECT.ACCOUNT,
          OBJECT.CONNECTION,
          REBUILD.SYNC_LEASE,
        ].some((identifier) => identifier === objectUniversalIdentifier),
        canUpdateAllRecords: [
          OBJECT.ACCOUNT,
          OBJECT.CONNECTION,
          REBUILD.SYNC_LEASE,
        ].some((identifier) => identifier === objectUniversalIdentifier),
        canSoftDeleteAllRecords:
          objectUniversalIdentifier === OBJECT.CONNECTION,
        canDestroyAllRecords: objectUniversalIdentifier === REBUILD.SYNC_LEASE,
      })),
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
        canReadAllRecords: true,
      },
    ],
  },
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.UPLOAD_FILE],
});
