import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import { TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
export default defineField({
  universalIdentifier: '4ccacaff-6b1d-425c-8cf9-6ca3a253973a',
  objectUniversalIdentifier: '796de564-8b24-4012-a1f6-be6159f4d766',
  name: 'twitterProfile',
  label: 'Twitter Profile',
  type: FieldType.RELATION,
  icon: 'IconBrandTwitter',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    '3d938b0c-4333-48a8-a667-17f34e4cfe1a',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'twitterProfileId',
  },
});
