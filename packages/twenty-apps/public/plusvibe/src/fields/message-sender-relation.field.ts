import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  MESSAGE_SENDER_RELATION_UNIVERSAL_IDENTIFIER,
  SENDER_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  SENDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: MESSAGE_SENDER_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'plusvibeSenderRecord',
  label: 'PlusVibe Sender',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier: SENDER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SENDER_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'plusvibeSenderRecordId',
  },
});
