import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { MESSAGE_ATTACHMENT_STATUS_UNIVERSAL_IDENTIFIER } from 'src/constants/schema-identifiers';

export default defineField({
  universalIdentifier: MESSAGE_ATTACHMENT_STATUS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'slackAttachmentStatus',
  label: 'Slack Attachment Status',
  type: FieldType.TEXT,
  isNullable: true,
  isUIEditable: false,
});
