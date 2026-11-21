import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { ACCOUNT_FIELD, CONNECTION_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CONNECTION_FIELD.ACCOUNT,
  objectUniversalIdentifier: OBJECT.CONNECTION,
  type: FieldType.RELATION,
  name: 'account',
  label: 'Account',
  icon: 'IconBrandLinkedin',
  description: 'The LinkedIn Account on our side of this connection.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.ACCOUNT,
  relationTargetFieldMetadataUniversalIdentifier: ACCOUNT_FIELD.CONNECTIONS,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'accountId',
  },
});
