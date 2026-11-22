import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: '309e50a9-e5fa-4869-9b24-754a717568ef',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'twitterProfileRelations',
  label: 'Twitter Profiles',
  type: FieldType.RELATION,
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    '796de564-8b24-4012-a1f6-be6159f4d766',
  relationTargetFieldMetadataUniversalIdentifier:
    'cff569f8-66ae-48a0-9566-15990e19792d',
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
