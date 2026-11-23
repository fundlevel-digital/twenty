import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: 'd31ae67b-cf66-4bfc-8e8b-972033a1430f',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'plusvibeInboxResolution',
  label: 'Inbox Resolution',
  type: FieldType.TEXT,
  icon: 'IconMail',
  isNullable: true,
  isUIEditable: false,
});
