import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  CONVERSATION_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  LEAD_CONVERSATION_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  LEAD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: LEAD_CONVERSATION_LEAD_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
  name: 'conversationLinks',
  label: 'Conversations',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_LEAD_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_LEAD_LINK_LEAD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
