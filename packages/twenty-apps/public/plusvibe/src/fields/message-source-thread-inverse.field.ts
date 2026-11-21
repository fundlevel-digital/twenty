import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  MESSAGE_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SOURCE_THREAD_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  name: 'messages',
  label: 'Messages',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    MESSAGE_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
