import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: '0ef0a237-15a4-5d8b-a617-b9b6c058a4ed',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'slackAttachmentState',
  label: 'Slack Attachment Status',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '508e85a0-aa89-5888-9ffb-f25dc39a3f42',
      value: 'IMPORTED',
      label: 'Imported',
      position: 0,
      color: 'green',
    },
    {
      id: '5af84257-6b77-5912-9ce5-c6308b37d1fd',
      value: 'UNAVAILABLE',
      label: 'Unavailable',
      position: 1,
      color: 'gray',
    },
    {
      id: 'e61da3e6-b4c3-5adc-a969-3c1bfbffcdc2',
      value: 'FAILED',
      label: 'Failed',
      position: 2,
      color: 'red',
    },
    {
      id: 'c9d8e703-a67b-5a73-83ca-592b7c261008',
      value: 'CHANGED',
      label: 'Changed',
      position: 3,
      color: 'orange',
    },
  ],
});
