import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';

export default defineField({
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  universalIdentifier: identifiers.MESSAGE_PARENT_UNIVERSAL_IDENTIFIER,
  name: 'slackReplyTo',
  label: 'Reply To',
  type: FieldType.RELATION,
  isNullable: true,
  isUIEditable: false,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    identifiers.MESSAGE_REPLIES_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'slackReplyToId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
