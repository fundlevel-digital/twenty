import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: '3d938b0c-4333-48a8-a667-17f34e4cfe1a',
  objectUniversalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'companyRelations',
  label: 'Companies',
  type: FieldType.RELATION,
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    '796de564-8b24-4012-a1f6-be6159f4d766',
  relationTargetFieldMetadataUniversalIdentifier:
    '4ccacaff-6b1d-425c-8cf9-6ca3a253973a',
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
