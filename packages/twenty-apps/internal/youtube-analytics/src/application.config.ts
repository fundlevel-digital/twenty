import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  RECENT_VIDEO_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'YouTube Analytics',
  logo: 'public/youtube.png',
  description:
    'Stores YouTube channels, subscribers and calculated video statistics, with daily and on-demand refresh.',
  author: 'Fundlevel',
  category: 'Enrichment',
  applicationVariables: {
    NUMBER_TIMEFRAME_DAYS: {
      universalIdentifier: '0584f3fc-baf9-4afb-99d3-2784e8a5ce83',
      label: 'Number Timeframes In Days (1–366)',
      description:
        'Add up to 10 day windows for view, like and comment counts. Save then refresh a channel to synchronize CRM columns.',
      isSecret: false,
      type: FieldType.ARRAY,
      value: ['30', '60', '90'],
    },
    PERCENTAGE_TIMEFRAME_DAYS: {
      universalIdentifier: '6550d622-aeeb-490f-83e0-52ffb3860d67',
      label: 'Percentage Timeframes In Days (1–366)',
      description:
        'Add up to 10 day windows for engagement and view-rate percentages. Save then refresh a channel to synchronize CRM columns.',
      isSecret: false,
      type: FieldType.ARRAY,
      value: ['30', '60', '90'],
    },
    METRIC_FORMAT: {
      universalIdentifier: 'f10549bb-e898-40ea-a119-3bb425058997',
      label: 'Metric Format',
      description:
        'Which metric columns to show for every configured timeframe and recent-video window. Save then refresh a channel to apply.',
      type: FieldType.SELECT,
      options: [
        { label: 'Numbers Only', value: 'NUMBERS' },
        { label: 'Percentages Only', value: 'PERCENTAGES' },
        { label: 'Both', value: 'BOTH' },
      ],
      isSecret: false,
      value: 'BOTH',
    },
    RECENT_VIDEO_COUNT: {
      universalIdentifier: RECENT_VIDEO_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Recent Video Window (2–30 Videos)',
      description:
        'Separate from day windows: averages and medians for the latest 2–30 qualifying videos, regardless of their age.',
      isSecret: false,
      value: '12',
    },
  },
});
