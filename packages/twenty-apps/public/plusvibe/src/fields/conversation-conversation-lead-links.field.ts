import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CONVERSATION_CONVERSATION_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier:
    CONVERSATION_CONVERSATION_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeLeadLinks',
  label: 'PlusVibe Leads',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_LEAD_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
