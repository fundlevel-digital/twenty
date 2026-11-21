import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  MESSAGE_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MESSAGE_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'plusvibeThreadRecord',
  label: 'PlusVibe Thread',
  type: FieldType.RELATION,
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SOURCE_THREAD_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'plusvibeThreadRecordId',
  },
});
