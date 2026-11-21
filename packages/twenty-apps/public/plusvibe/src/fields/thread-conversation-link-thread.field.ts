import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: THREAD_CONVERSATION_LINK_THREAD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  name: 'thread',
  label: 'Thread',
  type: FieldType.RELATION,
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'threadId',
  },
});
