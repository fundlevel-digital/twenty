import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  RECENT_POST_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'TwitterAPI.io',
  logo: 'public/twitterapi.png',
  description:
    'Stores Twitter profiles, followers and calculated post statistics, with daily and on-demand refresh.',
  author: 'Fundlevel',
  category: 'Enrichment',
  applicationVariables: {
    COMPANY_AUTO_MODE: {
      universalIdentifier: '363043dd-afa9-4ba6-8a53-b73da5dc4ff6',
      label: 'Company Automatic Profile Creation',
      isSecret: false,
      value: 'OFF',
    },
    COMPANY_SOURCE_FIELD: {
      universalIdentifier: 'd7e4ee04-5cc5-47f5-bf92-c56d77004014',
      label: 'Company X Link Field',
      isSecret: false,
      value: '',
    },
    COMPANY_LINK_MODE: {
      universalIdentifier: '48335a4d-41d5-4041-ac47-f110c648d599',
      label: 'Company Relation Changes',
      isSecret: false,
      value: 'ADD_ONLY',
    },
    PERSON_AUTO_MODE: {
      universalIdentifier: '24c0091a-7b21-4d5f-94d2-e9bb1fe375fa',
      label: 'Person Automatic Profile Creation',
      isSecret: false,
      value: 'OFF',
    },
    PERSON_SOURCE_FIELD: {
      universalIdentifier: 'edaebeeb-4994-42b4-ac4d-aeb42f0ef7da',
      label: 'Person X Link Field',
      isSecret: false,
      value: '',
    },
    PERSON_LINK_MODE: {
      universalIdentifier: 'ba50ff38-70dd-4371-8fa7-9a4987102255',
      label: 'Person Relation Changes',
      isSecret: false,
      value: 'ADD_ONLY',
    },
    NUMBER_TIMEFRAME_DAYS: {
      universalIdentifier: 'f8e7a361-20bb-4703-adb8-ae9e732dbbd9',
      label: 'Number Timeframes In Days (1–366)',
      description:
        'Add up to 10 day windows for view, like and reply counts. Save then refresh a profile to synchronize CRM columns.',
      isSecret: false,
      type: FieldType.ARRAY,
      value: ['30', '60', '90'],
    },
    PERCENTAGE_TIMEFRAME_DAYS: {
      universalIdentifier: '14ef2268-5f1f-47ab-a8eb-6121ef2efdee',
      label: 'Percentage Timeframes In Days (1–366)',
      description:
        'Add up to 10 day windows for engagement and view-rate percentages. Save then refresh a profile to synchronize CRM columns.',
      isSecret: false,
      type: FieldType.ARRAY,
      value: ['30', '60', '90'],
    },
    METRIC_FORMAT: {
      universalIdentifier: '182c471a-e98a-44cc-95e6-1219fbdfdb9b',
      label: 'Metric Format',
      description:
        'Which metric columns to show for every configured timeframe and recent-post window. Save then refresh a profile to apply.',
      type: FieldType.SELECT,
      options: [
        { label: 'Numbers Only', value: 'NUMBERS' },
        { label: 'Percentages Only', value: 'PERCENTAGES' },
        { label: 'Both', value: 'BOTH' },
      ],
      isSecret: false,
      value: 'BOTH',
    },
    RECENT_POST_COUNT: {
      universalIdentifier: RECENT_POST_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Recent Post Window (2–30 Posts)',
      description:
        'Separate from day windows: averages and medians for the latest 2–30 qualifying posts, regardless of their age.',
      isSecret: false,
      value: '12',
    },
  },
});
