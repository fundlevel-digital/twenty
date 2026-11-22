import {
  defineApplicationRole,
  SystemPermissionFlag,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Twitter Analytics Refresh Role',
  description:
    'Reads and updates Twitter Profiles and synchronizes metric columns and views, and manages its own configuration.',
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
        objectUniversalIdentifier: '796de564-8b24-4012-a1f6-be6159f4d766',
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
        canSoftDeleteAllRecords: true,
      },
      {
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier: '551d923a-7eac-4f5e-ab6b-799902983e17',
        canReadAllRecords: true,
        canCreateAllRecords: true,
        canUpdateAllRecords: true,
        canSoftDeleteAllRecords: true,
      },
      {
        objectUniversalIdentifier: INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
      },
      {
        objectUniversalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
        canUpdateAllRecords: true,
        canCreateAllRecords: true,
      },
    ],
  },
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.DATA_MODEL,
    SystemPermissionFlag.VIEWS,
    SystemPermissionFlag.APPLICATIONS,
    SystemPermissionFlag.UPLOAD_FILE,
  ],
});
