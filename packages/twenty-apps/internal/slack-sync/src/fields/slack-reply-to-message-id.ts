import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';

export default defineField({
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  universalIdentifier: identifiers.MESSAGE_REPLY_ID_UNIVERSAL_IDENTIFIER,
  name: 'slackReplyToMessageId',
  label: 'Slack Reply To Message ID',
  type: FieldType.TEXT,
  isNullable: true,
  isUIEditable: false,
});
