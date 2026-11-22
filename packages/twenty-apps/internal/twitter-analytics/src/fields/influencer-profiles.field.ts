import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  PROFILE_INFLUENCER_FIELD_UNIVERSAL_IDENTIFIER,
  INFLUENCER_PROFILES_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: INFLUENCER_PROFILES_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: INFLUENCER_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'twitterProfiles',
  label: 'Twitter Profiles',
  type: FieldType.RELATION,
  icon: 'IconBrandTwitter',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    PROFILE_INFLUENCER_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
