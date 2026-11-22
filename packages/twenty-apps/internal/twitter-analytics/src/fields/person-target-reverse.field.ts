import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'a5e44932-65de-4c79-b171-ab76cdbc03c5',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'twitterProfileRelations',
  label: 'Twitter Profiles',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    '551d923a-7eac-4f5e-ab6b-799902983e17',
  relationTargetFieldMetadataUniversalIdentifier:
    'dc64e9c2-d920-4a83-bc8b-fe587822fe82',
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
