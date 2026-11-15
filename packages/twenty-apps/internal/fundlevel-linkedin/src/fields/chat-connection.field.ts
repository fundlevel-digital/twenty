import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { CHAT_FIELD, CONNECTION_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CHAT_FIELD.CONNECTION,
  objectUniversalIdentifier: OBJECT.CHAT,
  type: FieldType.RELATION,
  name: 'connection',
  label: 'Connection',
  icon: 'IconUser',
  description: 'The LinkedIn Connection this chat is with.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CONNECTION,
  relationTargetFieldMetadataUniversalIdentifier: CONNECTION_FIELD.CHATS,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'connectionId',
  },
});
