import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { ACCOUNT_FIELD, CHAT_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ACCOUNT_FIELD.CHATS,
  objectUniversalIdentifier: OBJECT.ACCOUNT,
  type: FieldType.RELATION,
  name: 'chats',
  label: 'Chats',
  icon: 'IconMessages',
  description: 'LinkedIn Chats of this account.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CHAT,
  relationTargetFieldMetadataUniversalIdentifier: CHAT_FIELD.ACCOUNT,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
