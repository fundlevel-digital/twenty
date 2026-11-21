import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { CONNECTION_FIELD, MESSAGE_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MESSAGE_FIELD.CONNECTION,
  objectUniversalIdentifier: OBJECT.MESSAGE,
  type: FieldType.RELATION,
  name: 'connection',
  label: 'Connection',
  icon: 'IconUsers',
  description: 'The LinkedIn Connection (account and member pair) this message belongs to.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CONNECTION,
  relationTargetFieldMetadataUniversalIdentifier: CONNECTION_FIELD.MESSAGES,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'connectionId',
  },
});
