import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: THREAD_THREAD_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  name: 'leadLinks',
  label: 'Leads',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    THREAD_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_LEAD_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
