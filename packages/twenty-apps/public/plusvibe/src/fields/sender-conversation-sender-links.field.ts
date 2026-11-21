import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  CONVERSATION_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  SENDER_CONVERSATION_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: SENDER_CONVERSATION_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  name: 'conversationLinks',
  label: 'Conversations',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_SENDER_LINK_SENDER_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
