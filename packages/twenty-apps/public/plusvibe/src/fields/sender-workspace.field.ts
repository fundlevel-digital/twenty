import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  SENDER_UNIVERSAL_IDENTIFIER,
  SENDER_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_SENDER_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: SENDER_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  name: 'workspaceRecord',
  label: 'Workspace',
  type: FieldType.RELATION,
  icon: 'IconSettings',
  relationTargetObjectMetadataUniversalIdentifier:
    WORKSPACE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    WORKSPACE_SENDER_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'workspaceRecordId',
  },
});
