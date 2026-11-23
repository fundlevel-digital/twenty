import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineField({
  universalIdentifier: IDENTIFIERS.INBOX_MAILBOX,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'googleGroupsMailbox',
  label: 'Group',
  type: FieldType.TEXT,
  icon: 'IconAt',
  isNullable: true,
  defaultValue: null,
});
