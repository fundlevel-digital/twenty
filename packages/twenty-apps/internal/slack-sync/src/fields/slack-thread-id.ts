import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import * as identifiers from 'src/constants/schema-identifiers';

export default defineField({
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  universalIdentifier: identifiers.THREAD_SLACK_ID_UNIVERSAL_IDENTIFIER,
  name: 'slackThreadId',
  label: 'Slack Thread ID',
  type: FieldType.TEXT,
  isNullable: true,
  isUIEditable: false,
  isUnique: true,
});
