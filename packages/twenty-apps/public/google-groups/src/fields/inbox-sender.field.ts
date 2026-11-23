import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineField({
  universalIdentifier: IDENTIFIERS.INBOX_SENDER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'googleGroupsSender',
  label: 'From',
  type: FieldType.TEXT,
  icon: 'IconUser',
  isNullable: true,
  defaultValue: null,
});
