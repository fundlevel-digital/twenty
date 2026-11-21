import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  WORKSPACE_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  WORKSPACE_ACTIVITY_RELATION_UNIVERSAL_IDENTIFIER,
  ACTIVITY_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: WORKSPACE_ACTIVITY_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  name: 'plusvibeEvents',
  label: 'Events',
  type: FieldType.RELATION,
  icon: 'IconSettings',
  relationTargetObjectMetadataUniversalIdentifier:
    ACTIVITY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    ACTIVITY_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
