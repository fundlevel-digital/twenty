import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineField({
  universalIdentifier: IDENTIFIERS.INBOX_RECEIVED_AT,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'googleGroupsReceivedAt',
  label: 'Received',
  type: FieldType.DATE_TIME,
  icon: 'IconCalendar',
  isNullable: true,
  defaultValue: null,
});
