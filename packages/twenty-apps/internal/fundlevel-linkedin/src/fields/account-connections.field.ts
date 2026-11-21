import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { ACCOUNT_FIELD, CONNECTION_FIELD, OBJECT } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ACCOUNT_FIELD.CONNECTIONS,
  objectUniversalIdentifier: OBJECT.ACCOUNT,
  type: FieldType.RELATION,
  name: 'connections',
  label: 'Connections',
  icon: 'IconUsers',
  description: 'LinkedIn Connections of this account, including pending requests and people we only chat with.',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT.CONNECTION,
  relationTargetFieldMetadataUniversalIdentifier: CONNECTION_FIELD.ACCOUNT,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
