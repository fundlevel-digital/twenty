import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineField({
  universalIdentifier: IDENTIFIERS.INBOX_ATTACHMENTS,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'googleGroupsAttachments',
  label: 'Attachments',
  type: FieldType.NUMBER,
  icon: 'IconPaperclip',
  isNullable: true,
  defaultValue: null,
});
