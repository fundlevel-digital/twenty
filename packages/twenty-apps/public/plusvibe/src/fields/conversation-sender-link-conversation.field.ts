import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CONVERSATION_CONVERSATION_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier:
    CONVERSATION_SENDER_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CONVERSATION_SENDER_LINK_UNIVERSAL_IDENTIFIER,
  name: 'conversation',
  label: 'Conversation',
  type: FieldType.RELATION,
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_CONVERSATION_SENDER_LINKS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'conversationId',
  },
});
