import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: TWITTER_PROFILE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'twitterProfile',
  namePlural: 'twitterProfiles',
  labelSingular: 'Twitter Profile',
  labelPlural: 'Twitter Profiles',
  description:
    'Twitter profile identities, followers and calculated public post statistics.',
  icon: 'IconBrandTwitter',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier:
    TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.name,
  imageIdentifierFieldMetadataUniversalIdentifier:
    TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.avatarFile,
  fields: [
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.avatarFile,
      name: 'avatarFile',
      label: 'Avatar',
      type: FieldType.FILES,
      universalSettings: { maxNumberOfValues: 1 },
      icon: 'IconPhoto',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.avatarUrl,
      name: 'avatarUrl',
      label: 'Avatar URL',
      type: FieldType.TEXT,
      icon: 'IconPhoto',
      isNullable: true,
    },
    {
      universalIdentifier: TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.name,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.twitterId,
      name: 'twitterId',
      label: 'User ID',
      type: FieldType.TEXT,
      icon: 'IconHash',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.twitterHandle,
      name: 'twitterHandle',
      label: 'Handle',
      type: FieldType.TEXT,
      icon: 'IconAt',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.twitterUrl,
      name: 'twitterUrl',
      label: 'Profile URL',
      type: FieldType.TEXT,
      icon: 'IconLink',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.followingCount,
      name: 'followingCount',
      label: 'Following',
      type: FieldType.NUMBER,
      icon: 'IconUsers',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.calculationError,
      name: 'calculationError',
      label: 'Refresh Error',
      type: FieldType.TEXT,
      icon: 'IconAlertCircle',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViews,
      name: 'averageViews',
      label: 'Average Views',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianViews,
      name: 'medianViews',
      label: 'Median Views',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage,
      name: 'averageEngagementPercentage',
      label: 'Average Engagement %',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianEngagementPercentage,
      name: 'medianEngagementPercentage',
      label: 'Median Engagement %',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViewRate,
      name: 'averageViewRate',
      label: 'Average View Rate %',
      type: FieldType.NUMBER,
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViews60d,
      name: 'averageViews60d',
      label: 'Average Views (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianViews60d,
      name: 'medianViews60d',
      label: 'Median Views (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconEye',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageEngagementPercentage60d,
      name: 'averageEngagementPercentage60d',
      label: 'Average Engagement % (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.medianEngagementPercentage60d,
      name: 'medianEngagementPercentage60d',
      label: 'Median Engagement % (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconHeart',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageViewRate60d,
      name: 'averageViewRate60d',
      label: 'Average View Rate % (60 Days)',
      type: FieldType.NUMBER,
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.followerCount,
      name: 'followerCount',
      label: 'Followers',
      type: FieldType.NUMBER,
      icon: 'IconUsers',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.postsPerMonth,
      name: 'postsPerMonth',
      label: 'Posts Per Month',
      type: FieldType.NUMBER,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.recentPostCount,
      name: 'recentPostCount',
      label: 'Recent Post Window',
      type: FieldType.NUMBER,
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.postsAnalyzed,
      name: 'postsAnalyzed',
      label: 'Recent Posts Analyzed',
      type: FieldType.NUMBER,
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.lastPostDate,
      name: 'lastPostDate',
      label: 'Last Post Date',
      type: FieldType.DATE,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.averageStatisticsUpdatedAt,
      name: 'averageStatisticsUpdatedAt',
      label: 'Statistics Updated',
      type: FieldType.DATE,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.lastCalculatedAt,
      name: 'lastCalculatedAt',
      label: 'Last Calculated',
      type: FieldType.DATE_TIME,
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.calculationsEnabled,
      name: 'calculationsEnabled',
      label: 'Calculations Enabled',
      type: FieldType.BOOLEAN,
      icon: 'IconCalculator',
      defaultValue: true,
    },
    {
      universalIdentifier:
        TWITTER_PROFILE_FIELD_UNIVERSAL_IDENTIFIERS.calculationStatus,
      name: 'calculationStatus',
      label: 'Calculation Status',
      type: FieldType.SELECT,
      icon: 'IconCircleCheck',
      defaultValue: "'PENDING'",
      options: [
        {
          id: '2614eefe-a73d-4b9b-be62-bae200e3c5b7',
          value: 'PENDING',
          label: 'Not Refreshed',
          color: 'gray',
          position: 0,
        },
        {
          id: 'c40f3aa9-7e45-4883-ac05-a76a0278be60',
          value: 'READY',
          label: 'Ready',
          color: 'green',
          position: 1,
        },
        {
          id: '741814d2-f067-4508-b47c-79310ac48a55',
          value: 'FAILED',
          label: 'Failed',
          color: 'red',
          position: 2,
        },
      ],
    },
  ],
});
