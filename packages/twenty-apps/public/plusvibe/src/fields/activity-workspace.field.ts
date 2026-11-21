import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
  ACTIVITY_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_ACTIVITY_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: ACTIVITY_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: ACTIVITY_UNIVERSAL_IDENTIFIER,
  name: 'workspaceRecord',
  label: 'Workspace',
  type: FieldType.RELATION,
  icon: 'IconSettings',
  relationTargetObjectMetadataUniversalIdentifier:
    WORKSPACE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    WORKSPACE_ACTIVITY_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'workspaceRecordId',
  },
});
