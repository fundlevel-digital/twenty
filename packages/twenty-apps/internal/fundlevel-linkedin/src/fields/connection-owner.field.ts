import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { OBJECT, REBUILD } from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: REBUILD.CONNECTION_OWNER,
  objectUniversalIdentifier: OBJECT.CONNECTION,
  type: FieldType.RELATION,
  name: 'owner',
  label: 'Owner',
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: REBUILD.MEMBER_CONNECTIONS,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'ownerId',
  },
});
