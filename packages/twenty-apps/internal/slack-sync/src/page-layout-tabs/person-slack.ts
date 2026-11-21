import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default definePageLayoutTab({
  universalIdentifier: '781d4ebe-7ea1-4a56-a57c-044258b25bba',
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.personRecordPage
      .universalIdentifier,
  title: 'Slack',
  icon: 'IconMessage',
  position: 60,
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: '7a7af984-1ca7-426e-a1ad-07f5ec3076fb',
      title: 'Slack conversations',
      type: 'FRONT_COMPONENT',
      heightBehavior: 'TAB_VIEWPORT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          'bb0cd2da-0d74-4ab9-82f9-25eae2b06f67',
      },
    },
  ],
});
