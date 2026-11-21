import { defineApplicationRole, SystemPermissionFlag } from 'twenty-sdk/define';

import {
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'YouTube Analytics Refresh Role',
  description:
    'Reads and updates YouTube Channels and synchronizes metric columns and views, and manages its own configuration.',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    objects: [
      {
        objectUniversalIdentifier: YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
        canReadAllRecords: true,
        canUpdateAllRecords: true,
      },
    ],
  },
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.DATA_MODEL,
    SystemPermissionFlag.VIEWS,
    SystemPermissionFlag.APPLICATIONS,
  ],
});
