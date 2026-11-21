import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: YOUTUBE_CHANNEL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'youtubeChannel',
  namePlural: 'youtubeChannels',
  labelSingular: 'YouTube Channel',
  labelPlural: 'YouTube Channels',
  description:
    'YouTube channel identities, subscribers and calculated public video statistics.',
  icon: 'IconBrandYoutube',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier:
    YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.name,
  imageIdentifierFieldMetadataUniversalIdentifier:
    YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.avatarFile,
  fields: [
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.avatarFile,
      name: 'avatarFile',
      label: 'Avatar',
      type: FieldType.FILES,
      universalSettings: { maxNumberOfValues: 1 },
      icon: 'IconPhoto',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.avatarUrl,
      name: 'avatarUrl',
      label: 'Avatar URL',
      type: FieldType.TEXT,
      icon: 'IconPhoto',
      isNullable: true,
    },
    {
      universalIdentifier: YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.name,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.youtubeId,
      name: 'youtubeId',
      label: 'Channel ID',
      type: FieldType.TEXT,
      icon: 'IconHash',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.youtubeHandle,
      name: 'youtubeHandle',
      label: 'Handle',
      type: FieldType.TEXT,
      icon: 'IconAt',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.youtubeUrl,
      name: 'youtubeUrl',
      label: 'Channel URL',
      type: FieldType.TEXT,
      icon: 'IconLink',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.uploadsPlaylistId,
      name: 'uploadsPlaylistId',
      label: 'Uploads Playlist ID',
      type: FieldType.TEXT,
      icon: 'IconPlaylist',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.calculationError,
      name: 'calculationError',
      label: 'Refresh Error',
      type: FieldType.TEXT,
      icon: 'IconAlertCircle',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
      name: 'averageViews',
      label: 'Average Views',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.medianViews,
      name: 'medianViews',
      label: 'Median Views',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage,
      name: 'averageEngagementPercentage',
      label: 'Average Engagement %',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.medianEngagementPercentage,
      name: 'medianEngagementPercentage',
      label: 'Median Engagement %',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageViewRate,
      name: 'averageViewRate',
      label: 'Average View Rate %',
      type: FieldType.NUMBER,
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageViews60d,
      name: 'averageViews60d',
      label: 'Average Views (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.medianViews60d,
      name: 'medianViews60d',
      label: 'Median Views (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage60d,
      name: 'averageEngagementPercentage60d',
      label: 'Average Engagement % (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.medianEngagementPercentage60d,
      name: 'medianEngagementPercentage60d',
      label: 'Median Engagement % (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageViewRate60d,
      name: 'averageViewRate60d',
      label: 'Average View Rate % (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.subscriberCount,
      name: 'subscriberCount',
      label: 'Subscribers',
      type: FieldType.NUMBER,
      icon: 'IconUsers',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.postsPerMonth,
      name: 'postsPerMonth',
      label: 'Posts Per Month',
      type: FieldType.NUMBER,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.recentVideoCount,
      name: 'recentVideoCount',
      label: 'Recent Video Window',
      type: FieldType.NUMBER,
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.videosAnalyzed,
      name: 'videosAnalyzed',
      label: 'Recent Videos Analyzed',
      type: FieldType.NUMBER,
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.lastPostDate,
      name: 'lastPostDate',
      label: 'Last Post Date',
      type: FieldType.DATE,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.averageStatisticsUpdatedAt,
      name: 'averageStatisticsUpdatedAt',
      label: 'Statistics Updated',
      type: FieldType.DATE,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.lastCalculatedAt,
      name: 'lastCalculatedAt',
      label: 'Last Calculated',
      type: FieldType.DATE_TIME,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.calculationsEnabled,
      name: 'calculationsEnabled',
      label: 'Calculations Enabled',
      type: FieldType.BOOLEAN,
      icon: 'IconCalculator',
      defaultValue: true,
    },
    {
      universalIdentifier:
        YOUTUBE_CHANNEL_FIELD_UNIVERSAL_IDENTIFIERS.calculationStatus,
      name: 'calculationStatus',
      label: 'Calculation Status',
      type: FieldType.SELECT,
      icon: 'IconCircleCheck',
      defaultValue: "'PENDING'",
      options: [
        {
          id: 'f05cc907-7eac-4be2-91f0-46ec97b5e983',
          value: 'PENDING',
          label: 'Not Refreshed',
          color: 'gray',
          position: 0,
        },
        {
          id: 'cf267cb3-9653-41df-85fa-e48b2f46c57d',
          value: 'READY',
          label: 'Ready',
          color: 'green',
          position: 1,
        },
        {
          id: '6eb76276-20f6-49d9-9944-036c750feb15',
          value: 'FAILED',
          label: 'Failed',
          color: 'red',
          position: 2,
        },
      ],
    },
  ],
});
