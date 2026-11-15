import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ACCOUNT_FIELD, OBJECT, WORKSPACE_MEMBER_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ACCOUNT_FIELD.OWNER,
  objectUniversalIdentifier: OBJECT.ACCOUNT,
  type: FieldType.RELATION,
  name: 'owner',
  label: 'Owner',
  icon: 'IconUserCircle',
  description: 'Workspace member this LinkedIn account belongs to. Set by hand.',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: WORKSPACE_MEMBER_FIELD.LINKEDIN_ACCOUNTS,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'ownerId',
  },
});
