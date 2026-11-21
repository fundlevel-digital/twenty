import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  NATIVE_THREAD_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_NATIVE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier:
    NATIVE_THREAD_SOURCE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeThreadRecord',
  label: 'PlusVibe Thread ID',
  type: FieldType.RELATION,
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier:
    SOURCE_THREAD_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SOURCE_THREAD_NATIVE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'plusvibeThreadRecordId',
  },
});
