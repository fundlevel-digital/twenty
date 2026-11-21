import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  LEAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  SENDER_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: SENDER_LEAD_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  name: 'leadLinks',
  label: 'Leads',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    LEAD_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
