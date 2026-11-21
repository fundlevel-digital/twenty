import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CONTACT_PRODUCTIONS_FIELD_UNIVERSAL_IDENTIFIER,
  PRODUCTION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CONTACT_PRODUCTIONS_FIELD_UNIVERSAL_IDENTIFIER,
  name: 'contactProductions',
  label: 'Contact Productions',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  isUIEditable: false,
  isAuditLogged: false,
  relationTargetObjectMetadataUniversalIdentifier:
    PRODUCTION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    '49188aa9-e6f1-4ab0-b495-6cc74e75b8ec',
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
