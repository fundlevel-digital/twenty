import { defineField, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineField({
  universalIdentifier: IDENTIFIERS.creatorEmailAvailability,
  objectUniversalIdentifier: IDENTIFIERS.creator,
  name: 'emailAvailability',
  label: 'Email Availability',
  type: FieldType.SELECT,
  icon: 'IconMail',
  isNullable: false,
  isUIEditable: false,
  defaultValue: "'MISSING'",
  options: [
    {
      id: '5adedc34-f153-4502-bc36-a0259a5ce4be',
      value: 'AVAILABLE',
      label: 'Has Email',
      position: 0,
      color: 'green',
    },
    {
      id: 'cf153aaa-032e-4b4f-97f9-da83ce36b137',
      value: 'MISSING',
      label: 'No Email',
      position: 1,
      color: 'gray',
    },
  ],
});
