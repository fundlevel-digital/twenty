import { defineView } from 'twenty-sdk/define';
import {
  PROFILE_INFLUENCER_FIELD_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: TWITTER_PROFILE_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All Twitter Profiles',
  icon: 'IconBrandTwitter',
  objectUniversalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: 'TABLE',
  fields: [
    {
      universalIdentifier: 'e1d8a7ee-2cb7-454b-82b6-b90b04879a8e',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.calculationsEnabled,
      position: 8,
      isVisible: true,
      size: 190,
    },
    {
      universalIdentifier: '1826821e-8501-4563-9e10-ad700dd640c8',
      fieldMetadataUniversalIdentifier:
        PROFILE_INFLUENCER_FIELD_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '11a77965-b920-4285-90a8-f76baf6580f1',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.name,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: 'e0bb46d2-e747-4629-9219-5d4bdb64fa90',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.twitterHandle,
      position: 1,
      isVisible: true,
      size: 190,
    },
    {
      universalIdentifier: '63ab745b-6e52-461b-8857-fa7c19eaaec8',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.followerCount,
      position: 2,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: 'a83689c5-9eb3-4329-8eb1-a1d57aa07f47',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
      position: 3,
      isVisible: false,
      size: 140,
    },
    {
      universalIdentifier: '629b1d7a-4834-4cc6-a22f-9c1531bb0425',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage,
      position: 4,
      isVisible: false,
      size: 200,
    },
    {
      universalIdentifier: '3abf07f0-0654-4122-b69f-bd616752ea1e',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.calculationStatus,
      position: 5,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: '208240e2-e4ab-41d9-89e0-41e6f3e73d75',
      fieldMetadataUniversalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.lastCalculatedAt,
      position: 6,
      isVisible: true,
      size: 180,
    },
  ],
});
