import { defineView } from 'twenty-sdk/define';
import {
  YOUTUBE_CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
  YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: YOUTUBE_CHANNEL_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All YouTube Channels',
  icon: 'IconBrandYoutube',
  objectUniversalIdentifier: YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  type: 'TABLE',
  fields: [
    {
      universalIdentifier: '4902d51f-19e0-4203-8d56-d633c3da711a',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.name,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '066ccbd8-496a-4dcc-a3c4-59293f33d442',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.youtubeHandle,
      position: 1,
      isVisible: true,
      size: 190,
    },
    {
      universalIdentifier: '78cc06fc-4788-49c1-888f-6c175daf1fdc',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.subscriberCount,
      position: 2,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: '12464abb-efef-4664-80dc-5be7891d2d9a',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
      position: 3,
      isVisible: false,
      size: 140,
    },
    {
      universalIdentifier: '718a3432-5a1f-4a35-97c6-ae7f7eb36c43',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage,
      position: 4,
      isVisible: false,
      size: 200,
    },
    {
      universalIdentifier: 'f22101cd-218c-4e7d-ad38-7f373397f0e8',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.calculationStatus,
      position: 5,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: '58f5d5e5-bff3-4559-a747-9b19b9adea06',
      fieldMetadataUniversalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.lastCalculatedAt,
      position: 6,
      isVisible: true,
      size: 180,
    },
  ],
});
