import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  PROFILE_INFLUENCER_FIELD_UNIVERSAL_IDENTIFIER,
  INFLUENCER_PROFILES_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PROFILE_INFLUENCER_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'influencer',
  label: 'Influencer',
  type: FieldType.RELATION,
  icon: 'IconUserStar',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    INFLUENCER_PROFILES_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'influencerId',
  },
});
