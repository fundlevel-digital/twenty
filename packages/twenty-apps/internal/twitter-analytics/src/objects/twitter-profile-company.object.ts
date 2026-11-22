import { defineObject, FieldType } from 'twenty-sdk/define';
export default defineObject({
  universalIdentifier: '796de564-8b24-4012-a1f6-be6159f4d766',
  nameSingular: 'twitterProfileCompany',
  namePlural: 'twitterProfileCompanies',
  labelSingular: 'Twitter Profile Company',
  labelPlural: 'Twitter Profile Companies',
  icon: 'IconBuildingSkyscraper',
  labelIdentifierFieldMetadataUniversalIdentifier:
    '1b7aeca6-070b-4c7f-b19b-eb8afe15880b',
  fields: [
    {
      universalIdentifier: '1b7aeca6-070b-4c7f-b19b-eb8afe15880b',
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
    },
    {
      universalIdentifier: '61af94dc-0731-4767-8bb2-ff19e9e0d4ba',
      name: 'automaticallyManaged',
      label: 'Automatically Managed',
      type: FieldType.BOOLEAN,
      defaultValue: false,
      isUIEditable: false,
    },
  ],
});
