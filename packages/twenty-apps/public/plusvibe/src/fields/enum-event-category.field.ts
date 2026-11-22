import { defineField, FieldType } from 'twenty-sdk/define';
import { ACTIVITY_UNIVERSAL_IDENTIFIER } from '../constants/universal-identifiers';

export default defineField({
  universalIdentifier: 'ff75a3c9-34e9-528b-b4e1-d00961d5aaab',
  objectUniversalIdentifier: ACTIVITY_UNIVERSAL_IDENTIFIER,
  name: 'eventCategory',
  label: 'Event',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '70dd0619-505c-5e21-aac0-512467a2db5d',
      value: 'EMAIL_REPLY',
      label: 'Email Reply',
      position: 0,
      color: 'green',
    },
    {
      id: '95799aa0-2f2c-583f-aa07-79730fbe56e5',
      value: 'EMAIL_SENT',
      label: 'Email Sent',
      position: 1,
      color: 'blue',
    },
    {
      id: 'd57c855d-7003-5fa1-aeb3-a9e268dcea72',
      value: 'UNIBOX_EMAIL_SENT',
      label: 'Unibox Email Sent',
      position: 2,
      color: 'blue',
    },
    {
      id: 'e02112b3-92ea-5676-8758-ec0fe8a46ffa',
      value: 'BOUNCED_EMAIL',
      label: 'Bounced Email',
      position: 3,
      color: 'red',
    },
    {
      id: '482e77f8-1858-5e07-a1ef-1a4a84b2595e',
      value: 'LEAD_LABEL_CHANGED',
      label: 'Lead Label Changed',
      position: 4,
      color: 'yellow',
    },
    {
      id: '545c4855-6aa0-5a15-8b90-f5d77f3f976c',
      value: 'OTHER',
      label: 'Other',
      position: 5,
      color: 'gray',
    },
  ],
});
