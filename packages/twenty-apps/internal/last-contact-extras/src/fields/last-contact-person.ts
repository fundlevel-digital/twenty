import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';

import { LATEST_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: LATEST_CONTACT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  name: 'lastContactPerson',
  label: 'Point of Contact',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  isUIEditable: false,
  isAuditLogged: false,
  description: 'The most recently contacted person linked to this influencer.',
  objectUniversalIdentifier: 'b50d1a77-2489-4795-aa30-e55a1b14c6e9',
  relationTargetObjectMetadataUniversalIdentifier:
    '20202020-e674-48e5-a542-72570eee7213',
  relationTargetFieldMetadataUniversalIdentifier:
    'ecc4af1f-abd0-42a9-83b4-1be6016f15a1',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'lastContactPersonId',
  },
});
