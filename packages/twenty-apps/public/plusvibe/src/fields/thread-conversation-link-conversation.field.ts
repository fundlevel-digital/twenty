import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CONVERSATION_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier:
    THREAD_CONVERSATION_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  name: 'conversation',
  label: 'Conversation',
  type: FieldType.RELATION,
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    CONVERSATION_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'conversationId',
  },
});
