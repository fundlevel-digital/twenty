import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CONVERSATION_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier:
    CONVERSATION_THREAD_CONVERSATION_LINKS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeThreadLinks',
  label: 'PlusVibe Threads',
  type: FieldType.RELATION,
  icon: 'IconArrowsShuffle',
  relationTargetObjectMetadataUniversalIdentifier:
    THREAD_CONVERSATION_LINK_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_CONVERSATION_LINK_CONVERSATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
