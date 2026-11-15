import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { CONNECTION_FIELD, MESSAGE_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CONNECTION_FIELD.MESSAGES,
  objectUniversalIdentifier: OBJECT.CONNECTION,
  type: FieldType.RELATION,
  name: 'messages',
  label: 'Messages',
  icon: 'IconMessage',
  description: 'LinkedIn Messages exchanged with this member from this account.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.MESSAGE,
  relationTargetFieldMetadataUniversalIdentifier: MESSAGE_FIELD.CONNECTION,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
