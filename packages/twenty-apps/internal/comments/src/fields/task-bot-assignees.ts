import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: '86f7dabe-2786-4de5-981d-3df239e797d8',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  name: 'openBotAssignees',
  label: 'Bot Assignees',
  type: FieldType.RAW_JSON,
  isNullable: true,
  isUIEditable: false,
});
