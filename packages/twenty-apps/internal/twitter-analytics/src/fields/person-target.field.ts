import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'dc64e9c2-d920-4a83-bc8b-fe587822fe82',
  objectUniversalIdentifier: '551d923a-7eac-4f5e-ab6b-799902983e17',
  name: 'person',
  label: 'Person',
  type: FieldType.RELATION,
  icon: 'IconUser',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    'a5e44932-65de-4c79-b171-ab76cdbc03c5',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'personId',
  },
});
