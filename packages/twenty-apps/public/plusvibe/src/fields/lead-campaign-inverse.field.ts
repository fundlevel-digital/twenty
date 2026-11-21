import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  LEAD_UNIVERSAL_IDENTIFIER,
  LEAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_LEAD_RELATION_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CAMPAIGN_LEAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  name: 'leads',
  label: 'Leads',
  type: FieldType.RELATION,
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LEAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
