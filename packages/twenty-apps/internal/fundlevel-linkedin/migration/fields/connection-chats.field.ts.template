import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { CHAT_FIELD, CONNECTION_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CONNECTION_FIELD.CHATS,
  objectUniversalIdentifier: OBJECT.CONNECTION,
  type: FieldType.RELATION,
  name: 'chats',
  label: 'Chats',
  icon: 'IconMessages',
  description: 'LinkedIn Chats with this member, across classic, Sales Navigator and InMail.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CHAT,
  relationTargetFieldMetadataUniversalIdentifier: CHAT_FIELD.CONNECTION,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
