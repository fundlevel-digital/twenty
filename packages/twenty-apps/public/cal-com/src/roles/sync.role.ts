import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';
export default defineApplicationRole({
  universalIdentifier: IDENTIFIERS.ROLE,
  label: 'Cal.com Sync',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    objects: [
      {
        objectUniversalIdentifier: IDENTIFIERS.BOOKING,
        canReadAllRecords: true,
        canUpdateAllRecords: true,
      },
      ...['person', 'calendarEvent', 'calendarChannelEventAssociation'].map(
        (name) => ({
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS[
              name as
                'person' | 'calendarEvent' | 'calendarChannelEventAssociation'
            ].universalIdentifier,
          canReadAllRecords: true,
          canCreateAllRecords: name === 'person',
          // Scoped app tokens derive create rights from the legacy write grant.
          canUpdateAllRecords: name === 'person',
        }),
      ),
    ],
  },
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.APPLICATIONS],
});
