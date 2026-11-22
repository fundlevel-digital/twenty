import { defineField, FieldType } from 'twenty-sdk/define';
import { OBJECT } from '../constants/universal-identifiers';

export default defineField({
  universalIdentifier: '589f9cfa-10eb-5c7c-b752-7281396d21a7',
  objectUniversalIdentifier: OBJECT.ACCOUNT,
  name: 'connectionMethodType',
  label: 'Connection Method',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: 'a374edb9-0b04-553c-ad0c-ea0fcd8ecfce',
      value: 'COOKIE',
      label: 'Cookie',
      position: 0,
      color: 'gray',
    },
    {
      id: '663f69e9-780b-5dc0-b5e7-61f817df9402',
      value: 'CREDENTIALS',
      label: 'Credentials',
      position: 1,
      color: 'gray',
    },
    {
      id: '026acaae-e3d6-5ef0-99f4-1d1aca2148bf',
      value: 'OAUTH',
      label: 'OAuth',
      position: 2,
      color: 'blue',
    },
    {
      id: '65ee78be-cb8d-50de-afd2-df2f42eae4b1',
      value: 'OTHER',
      label: 'Other',
      position: 3,
      color: 'gray',
    },
  ],
});
