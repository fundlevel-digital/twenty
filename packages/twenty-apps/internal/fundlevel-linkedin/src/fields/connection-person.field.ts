import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CONNECTION_FIELD, OBJECT, PERSON_FIELD } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CONNECTION_FIELD.PERSON,
  objectUniversalIdentifier: OBJECT.CONNECTION,
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  icon: 'IconUser',
  description:
    "The CRM person on the other side. Linked automatically when a person's LinkedIn Member ID or LinkedIn link matches exactly; people are never created by the sync.",
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: PERSON_FIELD.LINKEDIN_CONNECTIONS,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'personId',
  },
});
