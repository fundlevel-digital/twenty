import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
export default defineField({
  universalIdentifier: 'cff569f8-66ae-48a0-9566-15990e19792d',
  objectUniversalIdentifier: '796de564-8b24-4012-a1f6-be6159f4d766',
  name: 'company',
  label: 'Company',
  type: FieldType.RELATION,
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    '309e50a9-e5fa-4869-9b24-754a717568ef',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'companyId',
  },
});
