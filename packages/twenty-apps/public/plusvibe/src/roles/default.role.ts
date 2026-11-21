import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';
import {
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  LEAD_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'PlusVibe Sync',
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
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      CAMPAIGN_UNIVERSAL_IDENTIFIER,
      ACTIVITY_UNIVERSAL_IDENTIFIER,
      WORKSPACE_UNIVERSAL_IDENTIFIER,
      SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
      LEAD_UNIVERSAL_IDENTIFIER,
      SENDER_UNIVERSAL_IDENTIFIER,
      THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
      THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
      THREAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
      CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
      CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
      LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,

      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
    ].map((objectUniversalIdentifier) => ({
      objectUniversalIdentifier,
      canReadAllRecords: true,
      canCreateAllRecords:
        objectUniversalIdentifier !==
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      canUpdateAllRecords:
        objectUniversalIdentifier !==
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      canSoftDeleteAllRecords: false,
      canDestroyAllRecords: false,
    })),
  },
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.APPLICATIONS],
});
