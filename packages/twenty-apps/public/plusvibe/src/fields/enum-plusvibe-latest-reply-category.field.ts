import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: '1ce3770b-3f6f-5370-8ad4-1880119d5ab9',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeLatestReplyCategory',
  label: 'Latest Reply Label',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '0960081a-c130-5534-8e76-6098dac281bf',
      value: 'INTERESTED',
      label: 'Interested',
      position: 0,
      color: 'green',
    },
    {
      id: '89b520f6-dc67-5587-b1b6-558670d29a62',
      value: 'NOT_INTERESTED',
      label: 'Not Interested',
      position: 1,
      color: 'red',
    },
    {
      id: '1735e30d-eae4-52e5-bf14-e318d218afb2',
      value: 'UNSUBSCRIBED',
      label: 'Unsubscribed',
      position: 2,
      color: 'gray',
    },
    {
      id: '1434221c-6a60-54d3-a637-02288233af30',
      value: 'OUT_OF_OFFICE',
      label: 'Out of Office',
      position: 3,
      color: 'yellow',
    },
    {
      id: 'afe1501b-abaa-52aa-8297-e911c57ca5b0',
      value: 'OTHER',
      label: 'Other',
      position: 4,
      color: 'gray',
    },
  ],
});
