import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  universalIdentifier: '551d923a-7eac-4f5e-ab6b-799902983e17',
  nameSingular: 'twitterProfilePerson',
  namePlural: 'twitterProfilePeople',
  labelSingular: 'Twitter Profile Person',
  labelPlural: 'Twitter Profile People',
  icon: 'IconUser',
  labelIdentifierFieldMetadataUniversalIdentifier:
    '34ccdf9b-209e-4c9c-b4fc-bd3f7c55958f',
  fields: [
    {
      universalIdentifier: '34ccdf9b-209e-4c9c-b4fc-bd3f7c55958f',
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: '246cb140-b3c5-4256-971e-244d93b39f73',
      name: 'automaticallyManaged',
      label: 'Automatically Managed',
      type: FieldType.BOOLEAN,
      defaultValue: false,
      isUIEditable: false,
    },
  ],
});
