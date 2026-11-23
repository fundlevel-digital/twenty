import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: '14b5cb89-458f-5958-a7e4-59b4b1f3d237',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  name: 'botAssignees',
  label: 'Bot Assignees',
  type: FieldType.RAW_JSON,
  isNullable: true,
  isUIEditable: false,
});
