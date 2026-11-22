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
