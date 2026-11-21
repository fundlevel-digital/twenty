import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { ACCOUNT_FIELD, CHAT_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CHAT_FIELD.ACCOUNT,
  objectUniversalIdentifier: OBJECT.CHAT,
  type: FieldType.RELATION,
  name: 'account',
  label: 'Account',
  icon: 'IconBrandLinkedin',
  description: 'The LinkedIn Account this chat is in.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.ACCOUNT,
  relationTargetFieldMetadataUniversalIdentifier: ACCOUNT_FIELD.CHATS,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'accountId',
  },
});
