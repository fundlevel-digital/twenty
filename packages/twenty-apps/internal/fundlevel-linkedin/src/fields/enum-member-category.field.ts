import { defineField, FieldType } from 'twenty-sdk/define';
import { OBJECT } from '../constants/universal-identifiers';

export default defineField({
  universalIdentifier: '99a2e36f-284d-516f-a46d-6eb10ac3b357',
  objectUniversalIdentifier: OBJECT.CONNECTION,
  name: 'memberCategory',
  label: 'Member Type',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '047b883b-8d78-51e7-b8ec-8f1bbb3f2596',
      value: 'PERSON',
      label: 'Person',
      position: 0,
      color: 'blue',
    },
    {
      id: '6e3dee86-cd4b-59c0-a1aa-1c170b99ee9e',
      value: 'COMPANY',
      label: 'Company',
      position: 1,
      color: 'purple',
    },
    {
      id: 'dfe8d757-bb85-59c9-b414-c5d54b3622a7',
      value: 'ORGANIZATION',
      label: 'Organization',
      position: 2,
      color: 'purple',
    },
    {
      id: 'c92d6a40-1c7f-540d-99be-3face7ef8d1b',
      value: 'OTHER',
      label: 'Other',
      position: 3,
      color: 'gray',
    },
  ],
});
