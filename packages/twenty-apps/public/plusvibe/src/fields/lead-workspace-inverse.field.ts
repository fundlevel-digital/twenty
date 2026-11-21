import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  LEAD_UNIVERSAL_IDENTIFIER,
  LEAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_LEAD_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: WORKSPACE_LEAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  name: 'leads',
  label: 'Leads',
  type: FieldType.RELATION,
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LEAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
